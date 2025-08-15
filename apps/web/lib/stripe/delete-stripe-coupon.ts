import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// Delete a coupon on Stripe for connected accounts
export async function deleteStripeCoupon({
  couponId,
  stripeConnectId,
}: {
  couponId: string;
  stripeConnectId: string | null;
}) {
  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe coupon creation skipped.",
    );
    return;
  }

  try {
    return await stripe.coupons.del(couponId, {
      stripeAccount: stripeConnectId,
    });
  } catch (error) {
    console.error(
      `Failed to delete Stripe coupon for ${stripeConnectId}: ${error}`,
    );
    return null;
  }
}
