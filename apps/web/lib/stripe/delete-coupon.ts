import { Discount } from "@prisma/client";
import { stripeAppClient } from ".";

// Delete a coupon on Stripe for connected accounts
export async function deleteStripeCoupon({
  coupon,
  stripeConnectId,
}: {
  coupon: Pick<Discount, "couponId">;
  stripeConnectId: string | null;
}) {
  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe coupon creation skipped.",
    );
    return;
  }

  const { couponId } = coupon;

  if (!couponId) {
    console.error(
      "couponId not found for the discount. Stripe coupon deletion skipped.",
    );
    return;
  }

  const stripe = stripeAppClient({
    livemode: process.env.NODE_ENV === "production",
  });

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
