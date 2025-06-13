import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { Payload, Payouts } from "./utils";

export async function sendPaypalPayouts({
  payload,
  payouts,
}: {
  payload: Payload;
  payouts: Payouts[];
}) {
  if (payouts.length === 0) {
    console.log("No payouts for sending via PayPal, skipping...");
    return;
  }

  const { invoiceId } = payload;

  await createPayPalBatchPayout({
    payouts,
    invoiceId,
  });
}
