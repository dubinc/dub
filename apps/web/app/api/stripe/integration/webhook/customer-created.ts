import { includeTags } from "@/lib/api/links/include-tags";
import { createId } from "@/lib/api/utils";
import { determinePartnerReward } from "@/lib/partners/rewards";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { Customer } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const externalId = stripeCustomer.metadata?.dubCustomerId;
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

  // Check the customer is not already created
  // Find customer using projectConnectId and externalId (the customer's ID in the client app)
  const customerFound = await prisma.customer.findUnique({
    where: {
      projectConnectId_externalId: {
        projectConnectId: stripeAccountId,
        externalId,
      },
    },
  });

  let customer: Customer;

  if (customerFound) {
    // if customer exists (created via /track/lead)
    // update it with the Stripe customer ID (for future reference by invoice.paid)
    customer = await prisma.customer.update({
      where: {
        id: customerFound.id,
      },
      data: {
        stripeCustomerId: stripeCustomer.id,
        projectConnectId: stripeAccountId,
      },
    });
    return `Dub customer with ID ${customer.id} updated with Stripe customer ID ${stripeCustomer.id}`;
  } else {
    // else create a new customer
    customer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name: stripeCustomer.name,
        email: stripeCustomer.email,
        stripeCustomerId: stripeCustomer.id,
        projectConnectId: stripeAccountId,
        externalId,
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
        event: "lead",
        partnerId: link.partnerId,
        programId: link.programId,
      });

      if (!reward || reward.amount === 0) {
        return;
      }

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
}
