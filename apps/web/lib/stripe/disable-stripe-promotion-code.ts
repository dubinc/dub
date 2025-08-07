import { stripeAppClient } from ".";
import { LinkProps, WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripePromotionCode({
  workspace,
  link,
}: {
  workspace: Pick<WorkspaceProps, "stripeConnectId">;
  link: Pick<LinkProps, "couponCode">;
}) {
  if (!link.couponCode || !workspace.stripeConnectId) {
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list({
    code: link.couponCode,
    limit: 1,
  });

  if (promotionCodes.data.length === 0) {
    return;
  }

  try {
    const promotionCode = promotionCodes.data[0];

    return await stripe.promotionCodes.update(
      promotionCode.id,
      {
        active: false,
      },
      {
        stripeAccount: workspace.stripeConnectId,
      },
    );
  } catch (error) {
    console.error(
      `Failed to disable Stripe promotion code ${link.couponCode} for ${workspace.stripeConnectId}: ${error}`,
    );

    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
}
