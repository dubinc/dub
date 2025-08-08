import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripePromotionCode({
  couponCode,
  stripeConnectId,
}: {
  couponCode: string | null;
  stripeConnectId: string | null;
}) {
  if (!couponCode || !stripeConnectId) {
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list(
    {
      code: couponCode,
      limit: 1,
    },
    {
      stripeAccount: stripeConnectId,
    },
  );

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
        stripeAccount: stripeConnectId,
      },
    );
  } catch (error) {
    console.error(
      `Failed to disable Stripe promotion code ${couponCode} for ${stripeConnectId}: ${error}`,
    );

    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
}
