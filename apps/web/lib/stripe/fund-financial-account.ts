import { prettyPrint } from "@dub/utils";
import { stripeV2Fetch } from "./stripe-v2-client";

const financialAccountId = process.env.STRIPE_FINANCIAL_ACCOUNT_ID;

// Fund the Dub's financial account for Global payouts
export async function fundFinancialAccount(amount: number) {
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
  });

  if (error) {
    throw new Error(`Failed to Dub's fund financial account: ${error.message}`);
  }

  console.log("Money sent to Dub's financial account", prettyPrint(data));

  if (data.status !== "paid") {
    throw new Error(
      `Failed to fund Dub's financial account. The current status is ${data.status}.`,
    );
  }

  return data;
}
