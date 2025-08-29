import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripePromotionCode({
  promotionCode,
  stripeConnectId,
}: {
  promotionCode: string | null;
  stripeConnectId: string | null;
}) {
  if (!promotionCode || !stripeConnectId) {
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list(
    {
      code: promotionCode,
      limit: 1,
    },
    {
      stripeAccount: stripeConnectId,
    },
  );

  if (promotionCodes.data.length === 0) {
    console.error(
      `Stripe promotion code ${promotionCode} not found in the connected account ${stripeConnectId}.`,
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
        stripeAccount: stripeConnectId,
      },
    );

    console.info(
      `Stripe promotion code ${promotionCode} in the connected account ${stripeConnectId} has been disabled.`,
    );

    return promotionCode;
  } catch (error) {
    console.error(
      `Failed to disable Stripe promotion code ${promotionCode} in the connected account ${stripeConnectId}.`,
      error,
    );

    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
}
