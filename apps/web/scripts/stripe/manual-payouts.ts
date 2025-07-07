import { stripe } from "@/lib/stripe";
import "dotenv-flow/config";

// Just for testing purposes
async function main() {
  const connectedAccount = "acct_1Ri8yePKFVxAW5Pv";

  // 1. Do a transfer
  const transfer = await stripe.transfers.create({
    amount: 1000,
    currency: "usd",
    destination: connectedAccount,
  });

  console.log("Transfer created", {
    id: transfer.id,
    amount: transfer.amount,
    currency: transfer.currency,
    destination: transfer.destination,
  });

  // 2. Check the balance
  const balance = await stripe.balance.retrieve({
    stripeAccount: connectedAccount,
  });

  console.log("Balance", JSON.stringify(balance, null, 2));

  // 3. Create payout
  const payout = await stripe.payouts.create(
    {
      amount: balance.available[0].amount,
      currency: "usd",
    },
    {
      stripeAccount: connectedAccount,
    },
  );

  console.log("Payout created", {
    id: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    destination: payout.destination,
  });

  // 4. Check the balance after the payout
  const balance2 = await stripe.balance.retrieve({
    stripeAccount: connectedAccount,
  });

  console.log("Balance", balance2.available);
}

main();
