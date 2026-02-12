import { stripeV2Fetch } from "./stripe-v2-client";

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

  if (!stripeRecipientId) {
    throw new Error("Partner does not have a Stripe recipient account.");
  }

  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/outbound_payments",
    {
      headers: {
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
