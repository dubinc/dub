import { createId } from "@/lib/api/create-id";
import { getOrCreateCustomer } from "@/lib/api/customers/get-or-create-customer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordLead } from "@/lib/tinybird";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { LeadEventTB, StripeMode } from "@/lib/types";
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
  stripeCustomerId: string;
};

export async function attributeViaPromotionCodeId({
  promotionCodeId,
  workspace,
  mode,
  customerDetails,
}: {
  promotionCodeId: string; // must be Stripe's promotion code ID `promo_xxx`, not the actual promo code
  workspace: Pick<
    Project,
    "id" | "defaultProgramId" | "stripeConnectId" | "webhookEnabled"
  >;
  mode: StripeMode;
  customerDetails: PromoCodeCustomerDetails;
}) {
  const stripeAccountId = workspace.stripeConnectId!;
  const stripeCustomerId = customerDetails.stripeCustomerId;

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

  const { customer, created } = await getOrCreateCustomer({
    findMode: "first",
    where: {
      OR: [
        {
          stripeCustomerId,
        },
        {
          projectId: workspace.id,
          externalId: clickEvent.click_id,
        },
      ],
    },
    create: {
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

  // Concurrent webhook already created this customer — continue sale without re-recording lead
  if (!created) {
    const cachedLead = await redis.get<LeadEventTB>(`leadCache:${customer.id}`);
    let existingLead = cachedLead;

    if (!existingLead) {
      existingLead = await getLeadEvent({
        customerId: customer.id,
      });
    }

    if (!existingLead) {
      console.log(
        `Customer with stripeCustomerId ${stripeCustomerId} already exists but no lead event found, skipping promo code attribution...`,
      );
      return null;
    }

    return {
      linkId,
      customer,
      clickEvent,
      leadEvent: {
        ...existingLead,
        workspace_id: workspace.id,
      },
    };
  }

  // Prepare the payload for the lead event
  const { timestamp, ...rest } = clickEvent;

  const leadEvent = {
    ...rest,
    workspace_id: workspace.id,
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
            timestamp,
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
                  timestamp,
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
