import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";

export async function getSubscriptionProductId({
  stripeSubscriptionId,
  stripeAccountId,
  mode,
}: {
  stripeSubscriptionId?: string | null;
  stripeAccountId?: string | null;
  mode: StripeMode;
}) {
  if (!stripeAccountId || !stripeSubscriptionId) {
    return null;
  }

  try {
    const subscription = await stripeAppClient({
      mode,
    }).subscriptions.retrieve(stripeSubscriptionId, {
      stripeAccount: stripeAccountId,
    });

    return subscription.items.data[0].price.product as string;
  } catch (error) {
    console.log("Failed to get subscription price ID:", error);
    return null;
  }
}
