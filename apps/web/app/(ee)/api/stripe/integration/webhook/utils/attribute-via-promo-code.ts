import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { recordLead } from "@/lib/tinybird";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { StripeMode } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { COUNTRIES_TO_CONTINENTS, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { getPromotionCode } from "./get-promotion-code";

export type PromoCodeCustomerDetails = {
  name?: string | null;
  email?: string | null;
  address?: Pick<Stripe.Address, "country" | "state"> | null;
};

export async function attributeViaPromoCode({
  promotionCodeId,
  stripeAccountId,
  workspace,
  mode,
  stripeCustomerId,
  customerDetails,
}: {
  promotionCodeId: string;
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
    select: {
      link: true,
    },
  });

  if (!discountCode) {
    console.log(
      `Couldn't find link associated with promotion code ${promotionCode.code}, skipping...`,
    );
    return null;
  }

  const link = discountCode.link;
  const linkId = link.id;
  const customerAddress = customerDetails.address;

  // Record a fake click for this event
  const clickEvent = await recordFakeClick({
    link,
    customer: {
      continent: customerAddress?.country
        ? COUNTRIES_TO_CONTINENTS[customerAddress.country]
        : "Unknown",
      country: customerAddress?.country ?? "Unknown",
      region: customerAddress?.state ?? "Unknown",
    },
  });

  const customer = await prisma.customer.create({
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

  // Prepare the payload for the lead event
  const { timestamp, ...rest } = clickEvent;

  const leadEvent = {
    ...rest,
    workspace_id: clickEvent.workspace_id || customer.projectId,
    event_id: nanoid(16),
    event_name: "Checkout with discount code",
    customer_id: customer.id,
    metadata: "",
  };

  await recordLead(leadEvent);

  // record lead side effects (link stats, partner commissions, workflows, workspace webhook)
  waitUntil(
    (async () => {
      const linkUpdated = await incrementLinkLeads(link.id);

      let createdCommission:
        | Awaited<ReturnType<typeof createPartnerCommission>>
        | undefined = undefined;

      if (link.programId && link.partnerId) {
        createdCommission = await createPartnerCommission({
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
            eventName: "Checkout session completed",
            link: linkUpdated,
            customer,
            partner: createdCommission?.webhookPartner,
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
                  eventName: "Checkout session completed",
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

export async function incrementLinkLeads(linkId: string) {
  return prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      leads: {
        increment: 1,
      },
      lastLeadAt: new Date(),
    },
    include: includeTags,
  });
}
