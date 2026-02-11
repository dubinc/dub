import { stripeV2Fetch } from "./stripe-v2-client";

export interface CreateStripeInboundTransferParams {
  amount: number;
}

export async function createStripeInboundTransfer({
  amount,
}: CreateStripeInboundTransferParams) {
  const financialAccountId = process.env.STRIPE_FINANCIAL_ACCOUNT_ID;

  if (!financialAccountId) {
    throw new Error(
      "STRIPE_FINANCIAL_ACCOUNT_ID is not configured and no financial account was provided.",
    );
  }

  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/inbound_transfers",
    {
      body: {
        amount: {
          value: amount,
          currency: "usd",
        },
        from: {
          payment_method: "pm_1QZ992FZ9999999999999999", // TODO: replace with actual payment method ID
        },
        to: {
          financial_account: financialAccountId,
          currency: "usd",
        },
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
