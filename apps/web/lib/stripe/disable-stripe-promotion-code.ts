import { Link } from "@prisma/client";
import { stripeAppClient } from ".";
import { WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripePromotionCode({
  workspace,
  link,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  link: Pick<Link, "couponCode">;
}) {
  if (!link.couponCode) {
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
      code: link.couponCode,
      limit: 1,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  if (promotionCodes.data.length === 0) {
    console.error(
      `Stripe promotion code ${link.couponCode} not found (stripeConnectId=${workspace.stripeConnectId}).`,
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
