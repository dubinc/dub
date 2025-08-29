import { Discount } from "@prisma/client";
import { stripeAppClient } from ".";
import { WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// Create a coupon on Stripe for connected accounts
export async function createStripeCoupon({
  coupon,
  workspace,
}: {
  coupon: Pick<Discount, "amount" | "type" | "maxDuration">;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
}) {
  if (!workspace.stripeConnectId) {
    console.error(
      `stripeConnectId not found for the workspace ${workspace.id}. Skipping Stripe coupon creation.`,
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
    const stripeCoupon = await stripe.coupons.create(
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
        stripeAccount: workspace.stripeConnectId,
      },
    );

    console.info(
      `Stripe coupon ${stripeCoupon.id} created for workspace ${workspace.id}.`,
    );

    return stripeCoupon;
  } catch (error) {
    console.log(`Failed create Stripe coupon for workspace ${workspace.id}.`, {
      error,
      coupon,
    });

    return null;
  }
}
