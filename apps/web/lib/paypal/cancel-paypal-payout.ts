import { createPaypalToken } from "@/lib/paypal/create-paypal-token";
import { paypalEnv } from "@/lib/paypal/env";

export const cancelPaypalPayout = async (paypalTransferId: string) => {
  const paypalAccessToken = await createPaypalToken();

  const res = await fetch(
    `${paypalEnv.PAYPAL_API_HOST}/v1/payments/payouts-item/${paypalTransferId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paypalAccessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("[PayPal] Failed to cancel payout.", data);
    throw new Error("Failed to cancel PayPal payout.");
  }

  return data;
};
