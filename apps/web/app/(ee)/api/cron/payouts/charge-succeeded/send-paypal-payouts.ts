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
  const program = payouts[0].program;

  await createPayPalBatchPayout({
    program,
    payouts,
    invoiceId,
  });
}
