import { stripeV2Fetch } from "./stripe-v2-client";

export async function getStripeOutboundPayment(outboundPaymentId: string) {
  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/outbound_payments/:id",
    {
      params: {
        id: outboundPaymentId,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
