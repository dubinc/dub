import { stripeAppClient } from ".";
import { StripeMode } from "../types";

// TODO:
// Remove this file and use the disableDiscountCode method from the Stripe provider

export async function disableStripeDiscountCode({
  stripeConnectId,
  stripeMode,
  code,
}: {
  stripeConnectId: string;
  stripeMode: StripeMode;
  code: string;
}) {
  const stripe = stripeAppClient({
    mode: stripeMode,
  });

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
