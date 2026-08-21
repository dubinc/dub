import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { WebhookHandlerResponse } from "./types";

// Handle event "customer.subscription.deleted"
export async function customerSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
): Promise<WebhookHandlerResponse> {
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
