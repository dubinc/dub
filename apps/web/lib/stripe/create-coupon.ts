import { Discount } from "@prisma/client";
import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

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

  let duration: "once" | "repeating" | "forever" = "once";
  let durationInMonths: number | undefined = undefined;

  if (coupon.maxDuration === null) {
    duration = "forever";
  } else if (coupon.maxDuration === 0) {
    duration = "once";
  } else {
    duration = "repeating";
  }

  if (duration === "repeating" && coupon.maxDuration) {
    durationInMonths = coupon.maxDuration;
  }

  try {
    return await stripe.coupons.create(
      {
        currency: "usd",
        duration,
        ...(duration === "repeating" && {
          duration_in_months: durationInMonths,
        }),
        ...(coupon.type === "percentage"
          ? { percent_off: coupon.amount }
          : { amount_off: coupon.amount }),
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
  } catch (error) {
    console.error(
      `Failed to create Stripe coupon for ${stripeConnectId}: ${error}`,
      coupon,
    );
    return null;
  }
}
