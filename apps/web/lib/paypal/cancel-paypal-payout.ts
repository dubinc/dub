import { createPaypalToken } from "@/lib/paypal/create-paypal-token";
import { paypalEnv } from "@/lib/paypal/env";

export const cancelPaypalPayout = async (paypalTransferId: string) => {
  const paypalAccessToken = await createPaypalToken();

  const response = await fetch(
    `${paypalEnv.PAYPAL_API_HOST}/v1/payments/payouts-item/${paypalTransferId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paypalAccessToken}`,
      },
    },
  ).then((r) => r.json());

  return response;
};
