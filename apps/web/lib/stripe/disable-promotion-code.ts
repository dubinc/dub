import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// Disable a promotion code on Stripe for connected accounts
export async function disableStripePromotionCode({
  code,
  stripeConnectId,
}: {
  code: string;
  stripeConnectId: string | null;
}) {
  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe promotion code update skipped.",
    );
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list({
    code,
    limit: 1,
  });

  if (promotionCodes.data.length === 0) {
    console.error(
      `Promotion code ${code} not found in the connected account ${stripeConnectId}. Stripe promotion code update skipped.`,
    );
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
      `Failed to disable Stripe promotion code ${code} for ${stripeConnectId}: ${error}`,
    );

    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
}
