import { STRIPE_API_VERSION, stripeV2Fetch } from "./stripe-v2-client";

export interface CreateStripeOutboundPaymentParams {
  stripeRecipientId: string;
  amount: number;
  description: string;
  idempotencyKey: string;
}

export async function createStripeOutboundPayment({
  stripeRecipientId,
  amount,
  description,
  idempotencyKey,
}: CreateStripeOutboundPaymentParams) {
  const financialAccountId = process.env.STRIPE_FINANCIAL_ACCOUNT_ID;

  if (!financialAccountId) {
    throw new Error("STRIPE_FINANCIAL_ACCOUNT_ID is not configured.");
  }

  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/outbound_payments",
    {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": STRIPE_API_VERSION,
        "Idempotency-Key": idempotencyKey,
      },
      body: {
        from: {
          financial_account: financialAccountId,
          currency: "usd",
        },
        to: {
          recipient: stripeRecipientId,
          currency: "usdc",
        },
        amount: {
          value: amount,
          currency: "usd",
        },
        description,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
