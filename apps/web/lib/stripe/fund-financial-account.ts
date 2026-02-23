import { prettyPrint } from "@dub/utils";
import { STRIPE_API_VERSION, stripeV2Fetch } from "./stripe-v2-client";

const financialAccountId = process.env.STRIPE_FINANCIAL_ACCOUNT_ID;

interface FundFinancialAccountParams {
  amount: number;
  idempotencyKey: string;
}

// Fund the Dub's financial account for Global payouts
export async function fundFinancialAccount({
  amount,
  idempotencyKey,
}: FundFinancialAccountParams) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  if (!financialAccountId) {
    throw new Error("STRIPE_FINANCIAL_ACCOUNT_ID is not configured.");
  }

  const { data, error } = await stripeV2Fetch("/v1/payouts", {
    body: {
      amount,
      currency: "usd",
      payout_method: financialAccountId,
    },
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
  });

  if (error) {
    throw new Error(`Failed to fund Dub's financial account: ${error.message}`);
  }

  console.log("Money sent to Dub's financial account", prettyPrint(data));

  return data;
}
