import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { stripeAppClient } from "@/lib/stripe";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { WebhookPartner } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { WorkflowTrigger } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

export async function createNewCustomer(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const dubCustomerExternalId = stripeCustomer.metadata?.dubCustomerId;
  const clickId = stripeCustomer.metadata?.dubClickId;

  // The client app should always send dubClickId (dub_id) via metadata
  if (!clickId) {
    return "Click ID not found in Stripe customer metadata, skipping...";
  }

  // Find click
  const clickEvent = await getClickEvent({ clickId });
  if (!clickEvent || clickEvent.data.length === 0) {
    return `Click event with ID ${clickId} not found, skipping...`;
  }

  const clickData = clickEvent.data[0];

  // Find link
  const linkId = clickData.link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link || !link.projectId) {
    return `Link with ID ${linkId} not found or does not have a project, skipping...`;
  }

  // Create a customer
  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      name: stripeCustomer.name || generateRandomName(),
      email: stripeCustomer.email,
      stripeCustomerId: stripeCustomer.id,
      projectConnectId: stripeAccountId,
      externalId: dubCustomerExternalId,
      projectId: link.projectId,
      linkId,
      clickId,
      clickedAt: new Date(clickData.timestamp + "Z"),
      country: clickData.country,
    },
  });

  const eventName = "New customer";

  const leadData = {
    ...clickData,
    event_id: nanoid(16),
    event_name: eventName,
    customer_id: customer.id,
  };

  const [_lead, linkUpdated, workspace] = await Promise.all([
    // Record lead
    recordLead(leadData),

    // update link leads count + lastLeadAt date
    prisma.link.update({
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
    }),

    // update workspace usage
    prisma.project.update({
      where: {
        id: customer.projectId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),
  ]);

  let webhookPartner: WebhookPartner | undefined;
  if (link.programId && link.partnerId) {
    const createdCommission = await createPartnerCommission({
      event: "lead",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId: leadData.event_id,
      customerId: customer.id,
      quantity: 1,
      context: {
        customer: {
          country: customer.country,
        },
      },
    });
    webhookPartner = createdCommission?.webhookPartner;
  }

  waitUntil(
    Promise.allSettled([
      sendWorkspaceWebhook({
        trigger: "lead.created",
        workspace,
        data: transformLeadEventData({
          ...clickData,
          eventName,
          link: linkUpdated,
          customer,
          partner: webhookPartner,
          metadata: null,
        }),
      }),

      link.programId &&
        link.partnerId &&
        executeWorkflows({
          trigger: WorkflowTrigger.leadRecorded,
          context: {
            programId: link.programId,
            partnerId: link.partnerId,
            current: {
              leads: 1,
            },
          },
        }),
    ]),
  );

  return `New Dub customer created: ${customer.id}. Lead event recorded: ${leadData.event_id}`;
}

export async function getConnectedCustomer({
  stripeCustomerId,
  stripeAccountId,
  livemode = true,
}: {
  stripeCustomerId?: string | null;
  stripeAccountId?: string | null;
  livemode?: boolean;
}) {
  // if stripeCustomerId or stripeAccountId is not provided, return null
  if (!stripeCustomerId || !stripeAccountId) {
    return null;
  }

  const connectedCustomer = await stripeAppClient({
    livemode,
  }).customers.retrieve(stripeCustomerId, {
    stripeAccount: stripeAccountId,
  });

  if (connectedCustomer.deleted) {
    return null;
  }

  return connectedCustomer;
}

export async function updateCustomerWithStripeCustomerId({
  stripeAccountId,
  dubCustomerId,
  stripeCustomerId,
}: {
  stripeAccountId?: string | null;
  dubCustomerId: string;
  stripeCustomerId?: string | null;
}) {
  // if stripeCustomerId or stripeAccountId is not provided, return null
  // (same logic as in getConnectedCustomer)
  if (!stripeCustomerId || !stripeAccountId) {
    return null;
  }

  try {
    // Update customer with stripeCustomerId if exists – for future events
    return await prisma.customer.update({
      where: {
        projectConnectId_externalId: {
          projectConnectId: stripeAccountId,
          externalId: dubCustomerId,
        },
      },
      data: {
        stripeCustomerId,
      },
    });
  } catch (error) {
    // Skip if customer not found (not an error, just a case where the customer doesn't exist on Dub yet)
    console.log("Failed to update customer with StripeCustomerId:", error);
    return null;
  }
}

export async function getSubscriptionProductId({
  stripeSubscriptionId,
  stripeAccountId,
  livemode = true,
}: {
  stripeSubscriptionId?: string | null;
  stripeAccountId?: string | null;
  livemode?: boolean;
}) {
  if (!stripeAccountId || !stripeSubscriptionId) {
    return null;
  }

  try {
    const subscription = await stripeAppClient({
      livemode,
    }).subscriptions.retrieve(stripeSubscriptionId, {
      stripeAccount: stripeAccountId,
    });
    return subscription.items.data[0].price.product as string;
  } catch (error) {
    console.log("Failed to get subscription price ID:", error);
    return null;
  }
}

export async function getPromotionCode({
  promotionCodeId,
  stripeAccountId,
  livemode = true,
}: {
  promotionCodeId?: string | null;
  stripeAccountId?: string | null;
  livemode?: boolean;
}) {
  if (!stripeAccountId || !promotionCodeId) {
    return null;
  }

  try {
    return await stripeAppClient({
      livemode,
    }).promotionCodes.retrieve(promotionCodeId, {
      stripeAccount: stripeAccountId,
    });
  } catch (error) {
    console.log("Failed to get promotion code:", error);
    return null;
  }
}
