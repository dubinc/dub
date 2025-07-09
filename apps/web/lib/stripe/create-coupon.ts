import { Discount } from "@prisma/client";
import { stripeAppClient } from ".";

// Create a coupon on Stripe for connected accounts
export async function createStripeCoupon({
  coupon,
  stripeConnectId,
}: {
  coupon: Pick<Discount, "amount" | "type" | "maxDuration">;
  stripeConnectId: string | null;
}) {
  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe coupon creation skipped.",
    );
    return;
  }

  const stripe = stripeAppClient({
    livemode: process.env.NODE_ENV === "production",
  });

  const { type, amount, maxDuration } = coupon;

  const duration =
    maxDuration === null ? "forever" : maxDuration === 1 ? "once" : "repeating";

  try {
    return await stripe.coupons.create(
      {
        currency: "usd",
        duration,
        ...(duration === "repeating" && {
          duration_in_months: maxDuration!,
        }),
        ...(type === "percentage"
          ? { percent_off: amount }
          : { amount_off: amount }),
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
  } catch (error) {
    console.error(
      `Failed to create Stripe coupon for ${stripeConnectId}: ${error}`,
    );
    return null;
  }
}
