import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "customer.subscription.deleted"
export async function customerSubscriptionDeleted(event: Stripe.Event) {
  const deletedSubscription = event.data.object as Stripe.Subscription;

  const customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: deletedSubscription.customer.toString(),
    },
  });

  if (!customer) {
    return "Customer not found, skipping subscription cancellation...";
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: { subscriptionCanceledAt: new Date() },
  });

  return `Subscription cancelled, updating customer ${updatedCustomer.id} with subscriptionCanceledAt: ${updatedCustomer.subscriptionCanceledAt}`;
}
