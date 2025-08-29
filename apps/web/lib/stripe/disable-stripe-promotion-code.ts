import { stripeAppClient } from ".";
import { WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripePromotionCode({
  workspace,
  promotionCode,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  promotionCode: string | null;
}) {
  if (!promotionCode) {
    return;
  }

  if (!workspace.stripeConnectId) {
    console.error(
      `stripeConnectId not found for the workspace ${workspace.id}. Skipping Stripe coupon creation.`,
    );
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list(
    {
      code: promotionCode,
      limit: 1,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  if (promotionCodes.data.length === 0) {
    console.error(
      `Stripe promotion code ${promotionCode} not found (stripeConnectId=${workspace.stripeConnectId}).`,
    );
    return;
  }

  try {
    let promotionCode = promotionCodes.data[0];

    promotionCode = await stripe.promotionCodes.update(
      promotionCode.id,
      {
        active: false,
      },
      {
        stripeAccount: workspace.stripeConnectId,
      },
    );

    console.info(
      `Disabled Stripe promotion code ${promotionCode.code} (id=${promotionCode.id}, stripeConnectId=${workspace.stripeConnectId}).`,
    );

    return promotionCode;
  } catch (error) {
    console.error(
      `Failed to disable Stripe promotion code ${promotionCode} (stripeConnectId=${workspace.stripeConnectId}).`,
      error,
    );

    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
}
