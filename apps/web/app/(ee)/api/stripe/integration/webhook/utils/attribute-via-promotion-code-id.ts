import { createId } from "@/lib/api/create-id";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import { recordLead } from "@/lib/tinybird";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { StripeMode } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { COUNTRIES_TO_CONTINENTS, nanoid } from "@dub/utils";
import { Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { getPromotionCode } from "./get-promotion-code";
import { incrementLinkLeads } from "./increment-link-leads";

export type PromoCodeCustomerDetails = {
  name?: string | null;
  email?: string | null;
  address?: Pick<Stripe.Address, "country" | "state"> | null;
};

export async function attributeViaPromotionCodeId({
  promotionCodeId,
  stripeAccountId,
  workspace,
  mode,
  stripeCustomerId,
  customerDetails,
}: {
  promotionCodeId: string; // must be Stripe's promotion code ID `promo_xxx`, not the actual promo code
  stripeAccountId: string;
  workspace: Pick<
    Project,
    "id" | "defaultProgramId" | "stripeConnectId" | "webhookEnabled"
  >;
  mode: StripeMode;
  stripeCustomerId: string;
  customerDetails: PromoCodeCustomerDetails;
}) {
  // Find the promotion code for the promotion code id
  const promotionCode = await getPromotionCode({
    promotionCodeId,
    stripeAccountId,
    mode,
  });

  if (!promotionCode) {
    console.log(
      `Promotion code ${promotionCodeId} not found in connected account ${stripeAccountId}, skipping...`,
    );
    return null;
  }

  if (!workspace.defaultProgramId) {
    console.log(
      `Workspace with stripeConnectId ${stripeAccountId} has no default program, skipping...`,
    );
    return null;
  }

  const discountCode = await prisma.discountCode.findUnique({
    where: {
      programId_code: {
        programId: workspace.defaultProgramId,
        code: promotionCode.code,
      },
    },
    include: {
      link: true,
    },
  });

  if (!discountCode) {
    console.log(
      `Couldn't find discount code "${promotionCode.code}" in program "${workspace.defaultProgramId}", skipping...`,
    );
    return null;
  }

  if (discountCode.disabledAt) {
    console.log(
      `Discount code "${discountCode.code}" is disabled, skipping...`,
    );
    return null;
  }

  const link = discountCode.link;
  const linkId = link.id;
  const customerAddress = customerDetails.address;
  const customerCountry = customerAddress?.country?.toUpperCase();

  // Record a fake click for this event
  const clickEvent = await recordFakeClick({
    link,
    customer: {
      continent: customerCountry
        ? COUNTRIES_TO_CONTINENTS[customerCountry] ?? "Unknown"
        : "Unknown",
      country: customerCountry ?? "Unknown",
      region: customerAddress?.state ?? "Unknown",
    },
  });

  let customer: Awaited<ReturnType<typeof prisma.customer.create>>;
  try {
    customer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name:
          customerDetails.name || customerDetails.email || generateRandomName(),
        email: customerDetails.email,
        externalId: clickEvent.click_id,
        stripeCustomerId,
        linkId: clickEvent.link_id,
        clickId: clickEvent.click_id,
        clickedAt: new Date(clickEvent.timestamp + "Z"),
        country: customerAddress?.country,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
    });
  } catch (error) {
    // a concurrent webhook may have created the customer first (unique stripeCustomerId)
    if (error.code === "P2002") {
      console.log(
        `Customer with stripeCustomerId ${stripeCustomerId} was created concurrently, skipping promo code attribution...`,
      );
      return null;
    }
    throw error;
  }

  // Prepare the payload for the lead event
  const { timestamp, ...rest } = clickEvent;

  const leadEvent = {
    ...rest,
    workspace_id: clickEvent.workspace_id || customer.projectId,
    event_id: nanoid(16),
    event_name: "Attributed via discount code",
    customer_id: customer.id,
    metadata: "",
  };

  await recordLead(leadEvent);

  // cache lead event in Redis because the ingested event is not available immediately on Tinybird
  // (the sale recording right after this relies on reading the lead event back)
  await redis.set(`leadCache:${customer.id}`, leadEvent, {
    ex: 60 * 5,
  });

  // record lead side effects (link stats, partner commissions, workflows, workspace webhook)
  waitUntil(
    (async () => {
      const linkUpdated = await incrementLinkLeads(link.id);

      let result:
        | Awaited<ReturnType<typeof queuePartnerCommissionCreation>>
        | undefined = undefined;

      if (link.programId && link.partnerId) {
        result = await queuePartnerCommissionCreation({
          event: "lead",
          programId: link.programId,
          partnerId: link.partnerId,
          linkId: link.id,
          eventId: leadEvent.event_id,
          customerId: customer.id,
          quantity: 1,
          context: {
            customer: {
              country: customer.country,
            },
          },
        });

        await Promise.allSettled([
          executeWorkflows({
            trigger: "partnerMetricsUpdated",
            reason: "lead",
            identity: {
              workspaceId: workspace.id,
              programId: link.programId,
              partnerId: link.partnerId,
            },
            metrics: {
              current: {
                leads: 1,
              },
            },
          }),

          syncPartnerLinksStats({
            partnerId: link.partnerId,
            programId: link.programId,
            eventType: "lead",
          }),
        ]);
      }

      await Promise.allSettled([
        sendWorkspaceWebhook({
          trigger: "lead.created",
          workspace,
          data: transformLeadEventData({
            ...leadEvent,
            link: linkUpdated,
            customer,
            partner: result?.webhookPartner,
            metadata: null,
          }),
        }),

        ...(link.partnerId
          ? [
              sendPartnerPostback({
                partnerId: link.partnerId,
                event: "lead.created",
                data: {
                  ...leadEvent,
                  link: linkUpdated,
                  customer,
                },
              }),
            ]
          : []),
      ]);
    })(),
  );

  return {
    linkId,
    customer,
    clickEvent,
    leadEvent,
  };
}
