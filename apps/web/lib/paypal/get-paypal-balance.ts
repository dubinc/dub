import { createPaypalToken } from "@/lib/paypal/create-paypal-token";
import { paypalEnv } from "@/lib/paypal/env";

interface PayPalBalance {
  currency: string;
  value: string;
}

interface PayPalBalanceResponse {
  balances: PayPalBalance[];
}

// Get the current PayPal account balance by computing from transaction history
export async function getPayPalBalance(): Promise<PayPalBalanceResponse> {
  const paypalAccessToken = await createPaypalToken();

  // Get transactions for the last 30 days to compute current balance
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days

  const url = new URL(`${paypalEnv.PAYPAL_API_HOST}/v1/reporting/transactions`);
  url.searchParams.append(
    "start_date",
    startDate.toISOString().replace("Z", "-0700"),
  );
  url.searchParams.append(
    "end_date",
    endDate.toISOString().replace("Z", "-0700"),
  );
  url.searchParams.append("fields", "transaction_info"); // Only get transaction info to reduce payload

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${paypalAccessToken}`,
      "Content-Type": "application/json",
    },
  });

  console.log("[PayPal] Balance computation started", response);

  const data = await response.json();

  if (!response.ok) {
    console.error("[PayPal] Balance computation failed", data);
    throw new Error(
      `[PayPal] Balance computation failed. Error: ${JSON.stringify(data)}`,
    );
  }

  // Compute balance from transaction history
  let balance = 0;
  const currency = "USD"; // Default to USD, could be made dynamic

  if (data.transaction_details) {
    data.transaction_details.forEach(({ transaction_info }: any) => {
      const amount = parseFloat(
        transaction_info.transaction_amount?.value || "0",
      );
      const type = transaction_info.transaction_event_code;

      // Credit transactions (money received)
      if (["T0006", "T1107", "T1101", "T0004", "T0002"].includes(type)) {
        balance += amount;
      }
      // Debit transactions (money sent, fees, etc.)
      else if (["T0007", "T0400", "T1109", "T0003", "T0005"].includes(type)) {
        balance -= amount;
      }
    });
  }

  const result: PayPalBalanceResponse = {
    balances: [
      {
        currency,
        value: balance.toFixed(2),
      },
    ],
  };

  console.log("[PayPal] Balance computed", result);

  return result;
}
