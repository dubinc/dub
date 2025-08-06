import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// Create a promotion code on Stripe for connected accounts
export async function createStripePromotionCode({
  code,
  couponId,
  stripeConnectId,
}: {
  code: string;
  couponId: string | null;
  stripeConnectId: string | null;
}) {
  if (!couponId) {
    console.error(
      "couponId not found for the discount. Stripe promotion code creation skipped.",
    );
    return;
  }

  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe promotion code creation skipped.",
    );
    return;
  }

  try {
    return await stripe.promotionCodes.create(
      {
        coupon: couponId,
        code: code.toUpperCase(),
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
