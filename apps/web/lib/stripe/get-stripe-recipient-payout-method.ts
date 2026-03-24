import { STRIPE_API_VERSION, stripeV2Fetch } from "./stripe-v2-client";

export async function getStripeRecipientPayoutMethod(
  stripeRecipientId: string,
) {
  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/payout_methods",
    {
      query: {
        limit: 10,
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

  return data.data?.find((m) => m.type === "crypto_wallet") ?? null;
}
