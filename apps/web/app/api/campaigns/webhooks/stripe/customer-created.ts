import { prisma } from "@/lib/prisma";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import type Stripe from "stripe";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const externalId = stripeCustomer.metadata.dubCustomerId || null;
  const clickId = stripeCustomer.metadata.dubClickId || null;

  // The client app should always send dubClickId via metadata
  if (!clickId) {
    return;
  }

  // Find click
  const clickEvent = await getClickEvent({ clickId });
  if (!clickEvent || clickEvent.data.length === 0) {
    return;
  }

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(clickEvent.data[0]);

  // Create customer
  const customerId = nanoid(16);
  const customer = await prisma.customer.create({
    data: {
      id: customerId,
      name: stripeCustomer.name,
      email: stripeCustomer.email,
      stripeCustomerId: stripeCustomer.id,
      projectConnectId: stripeAccountId,
      externalId,
      project: {
        connect: {
          stripeConnectId: stripeAccountId,
        },
      },
    },
  });

  await Promise.all([
    // Record customer
    recordCustomer({
      workspace_id: customer.projectId,
      customer_id: customer.id,
      name: customer.name || "",
      email: customer.email || "",
      avatar: customer.avatar || "",
    }),

    // Record lead
    recordLead({
      ...clickData,
      event_id: nanoid(16),
      event_name: "Customer created",
      customer_id: customer.id,
    }),
  ]);
}
