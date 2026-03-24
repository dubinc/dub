import { log } from "@dub/utils";
import Stripe from "stripe";

export async function customerSubscriptionTrialWillEnd(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  await log({
    message: `Subscription trial ending soon: ${subscription.id} (customer ${subscription.customer})`,
    type: "cron",
  });

  return `Recorded trial_will_end for subscription ${subscription.id}.`;
}
