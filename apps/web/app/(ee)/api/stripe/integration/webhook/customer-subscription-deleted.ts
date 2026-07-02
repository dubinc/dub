import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { StripeWebhookOutput } from "./utils/types";

// Handle event "customer.subscription.deleted"
export async function customerSubscriptionDeleted({
  event,
}: {
  event: Stripe.CustomerSubscriptionDeletedEvent;
}): Promise<StripeWebhookOutput> {
  const deletedSubscription = event.data.object;

  const customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: deletedSubscription.customer.toString(),
    },
  });

  if (!customer) {
    return {
      response: "Customer not found, skipping subscription cancellation...",
    };
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: { subscriptionCanceledAt: new Date() },
  });

  return {
    response: `Subscription cancelled, updating customer ${updatedCustomer.id} with subscriptionCanceledAt: ${updatedCustomer.subscriptionCanceledAt}`,
  };
}
