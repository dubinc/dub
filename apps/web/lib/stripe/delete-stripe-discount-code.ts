import { stripeAppClient } from ".";
import { WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripePromotionCode({
  workspace,
  code,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  code: string;
}) {
  if (!workspace.stripeConnectId) {
    console.error(
      `stripeConnectId not found for the workspace ${workspace.id}. Skipping...`,
    );
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list(
    {
      code,
      limit: 1,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  if (promotionCodes.data.length === 0) {
    console.error(
      `Stripe promotion code ${code} not found (stripeConnectId=${workspace.stripeConnectId}).`,
    );
    return;
  }

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
}
