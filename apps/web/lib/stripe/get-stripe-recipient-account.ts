import { stripeV2Fetch } from "./stripe-v2-client";

export async function getStripeRecipientAccount(stripeRecipientId: string) {
  const { data, error } = await stripeV2Fetch("/v2/core/accounts/:id", {
    params: {
      id: stripeRecipientId,
    },
    query: {
      "include[0]": "configuration.recipient",
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
