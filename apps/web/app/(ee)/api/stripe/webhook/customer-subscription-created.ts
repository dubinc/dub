import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// workaround to make sure trial subscriptions are created with payment_behavior="default_incomplete"
export async function customerSubscriptionCreated(
  event: Stripe.CustomerSubscriptionCreatedEvent,
) {
  const createdSubscription = event.data.object;

  if (createdSubscription.status !== "trialing") {
    return `Subscription ${createdSubscription.id} is not in trialing status, skipping...`;
  }

  const updatedSubscription = await stripe.subscriptions.update(
    createdSubscription.id,
    {
      payment_behavior: "default_incomplete",
    },
  );

  return `Updated trial subscription ${updatedSubscription.id} with payment_behavior="default_incomplete"`;
}
