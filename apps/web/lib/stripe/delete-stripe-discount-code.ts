import { stripeAppClient } from ".";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

export async function disableStripeDiscountCode({
  stripeConnectId,
  code,
}: {
  stripeConnectId: string;
  code: string;
}) {
  if (!stripeConnectId) {
    console.error(
      `stripeConnectId is required to disable a Stripe discount code.`,
    );
    return;
  }

  const promotionCodes = await stripe.promotionCodes.list(
    {
      code,
      limit: 1,
    },
    {
      stripeAccount: stripeConnectId,
    },
  );

  if (promotionCodes.data.length === 0) {
    console.error(
      `Stripe promotion code ${code} not found (stripeConnectId=${stripeConnectId}).`,
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
      stripeAccount: stripeConnectId,
    },
  );

  console.info(
    `Disabled Stripe promotion code ${promotionCode.code} (id=${promotionCode.id}, stripeConnectId=${stripeConnectId}).`,
  );

  return promotionCode;
}
