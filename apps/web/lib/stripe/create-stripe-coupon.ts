import { Discount } from "@dub/prisma/client";
import { stripeAppClient } from ".";
import { WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// Create a coupon on Stripe for connected accounts
export async function createStripeCoupon({
  workspace,
  discount,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  discount: Pick<Discount, "amount" | "type" | "maxDuration">;
}) {
  if (!workspace.stripeConnectId) {
    console.error(
      `stripeConnectId not found for the workspace ${workspace.id}. Skipping Stripe coupon creation.`,
    );
    return;
  }

  let duration: "once" | "repeating" | "forever" = "once";
  let durationInMonths: number | undefined = undefined;

  if (discount.maxDuration === null) {
    duration = "forever";
  } else if (discount.maxDuration === 0) {
    duration = "once";
  } else {
    duration = "repeating";
  }

  if (duration === "repeating" && discount.maxDuration) {
    durationInMonths = discount.maxDuration;
  }

  try {
    const stripeCoupon = await stripe.coupons.create(
      {
        currency: "usd",
        duration,
        ...(duration === "repeating" && {
          duration_in_months: durationInMonths,
        }),
        ...(discount.type === "percentage"
          ? { percent_off: discount.amount }
          : { amount_off: discount.amount }),
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
    console.error(
      `Failed create Stripe coupon for workspace ${workspace.id}.`,
      {
        error,
        discount,
      },
    );

    throw error;
  }
}
