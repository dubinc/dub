import { stripeAppClient } from ".";

// Create a promotion code on Stripe for connected accounts
export async function createStripePromotionCode({
  couponId,
  linkKey,
  stripeConnectId,
}: {
  couponId: string;
  linkKey: string;
  stripeConnectId: string | null;
}) {
  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe promotion code creation skipped.",
    );
    return;
  }

  const stripe = stripeAppClient({
    livemode: process.env.NODE_ENV === "production",
  });

  try {
    return await stripe.promotionCodes.create(
      {
        coupon: couponId,
        code: linkKey.toUpperCase(),
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
  } catch (error) {
    console.error(
      `Failed to create Stripe promotion code for ${stripeConnectId}: ${error}`,
    );

    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
}
