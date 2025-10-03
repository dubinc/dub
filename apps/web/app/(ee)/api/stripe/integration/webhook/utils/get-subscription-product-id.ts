import { stripeAppClient } from "@/lib/stripe";

export async function getSubscriptionProductId({
  stripeSubscriptionId,
  stripeAccountId,
  livemode = true,
}: {
  stripeSubscriptionId?: string | null;
  stripeAccountId?: string | null;
  livemode?: boolean;
}) {
  if (!stripeAccountId || !stripeSubscriptionId) {
    return null;
  }

  try {
    const subscription = await stripeAppClient({
      livemode,
    }).subscriptions.retrieve(stripeSubscriptionId, {
      stripeAccount: stripeAccountId,
    });
    return subscription.items.data[0].price.product as string;
  } catch (error) {
    console.log("Failed to get subscription price ID:", error);
    return null;
  }
}
