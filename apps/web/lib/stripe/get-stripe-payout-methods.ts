import { STRIPE_API_VERSION, stripeV2Fetch } from "./stripe-v2-client";

interface GetStripePayoutMethodsParams {
  stripeRecipientId: string;
}

export async function getStripePayoutMethods({
  stripeRecipientId,
}: GetStripePayoutMethodsParams) {
  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/payout_methods",
    {
      query: {
        limit: 1,
        "usage_status[payments]": "eligible",
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

  return data?.data;
}
