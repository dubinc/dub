import { stripeAppClient } from ".";
import { DiscountProps, WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function createStripeDiscountCode({
  workspace,
  discount,
  code,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  discount: Pick<DiscountProps, "id" | "couponId">;
  code: string;
}) {
  if (!workspace.stripeConnectId) {
    console.error(
      `stripeConnectId not found for the workspace ${workspace.id}. Stripe promotion code creation skipped.`,
    );
    return;
  }

  if (!discount.couponId) {
    console.error(
      `couponId not found for the discount ${discount.id}. Stripe promotion code creation skipped.`,
    );
    return;
  }

  return await stripe.promotionCodes.create(
    {
      coupon: discount.couponId,
      code: code.toUpperCase(),
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );
}