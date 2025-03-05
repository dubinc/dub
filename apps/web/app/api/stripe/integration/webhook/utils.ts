import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { generateRandomName } from "@/lib/names";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
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

  // Create a new customer
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

    // update link leads count
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        leads: {
          increment: 1,
        },
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

  if (link.programId && link.partnerId) {
    const reward = await determinePartnerReward({
      programId: link.programId,
      partnerId: link.partnerId,
      event: "lead",
    });

    if (reward) {
      await prisma.commission.create({
        data: {
          id: createId({ prefix: "cm_" }),
          programId: link.programId,
          linkId: link.id,
          partnerId: link.partnerId,
          eventId: leadData.event_id,
          customerId: customer.id,
          type: "lead",
          amount: 0,
          quantity: 1,
          earnings: reward.amount,
        },
      });
    }
  }

  waitUntil(
    sendWorkspaceWebhook({
      trigger: "lead.created",
      workspace,
      data: transformLeadEventData({
        ...clickData,
        eventName,
        link: linkUpdated,
        customer,
      }),
    }),
  );

  return `New Dub customer created: ${customer.id}. Lead event recorded: ${leadData.event_id}`;
}
