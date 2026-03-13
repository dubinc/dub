import { STRIPE_API_VERSION, stripeV2Fetch } from "./stripe-v2-client";

export async function getStripeStablecoinPayoutMethod(
  stripeRecipientId: string,
) {
  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/payout_methods",
    {
      query: {
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": STRIPE_API_VERSION,
        "Stripe-Context": stripeRecipientId,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data.data?.[0] ?? null;
}
