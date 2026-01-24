import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;

  const customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: stripeCustomer.id,
    },
  });

  if (!customer) {
    return "Customer not found, skipping subscription cancellation...";
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { subscriptionCanceledAt: new Date() },
  });
}
