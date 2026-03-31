import { getPendingPaypalPayouts } from "@/lib/paypal/get-pending-payouts";
import {
  COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  currencyFormatter,
} from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  console.log("Checking pending PayPal payouts...");
  console.log(
    "PayPal supported countries:",
    PAYPAL_SUPPORTED_COUNTRIES,
    PAYPAL_SUPPORTED_COUNTRIES.map((country) => COUNTRIES[country]),
  );

  const payouts = await getPendingPaypalPayouts();

  const finalPayouts = payouts.map((payout) => ({
    program: payout.program.name,
    partner: payout.partner.email,
    status: payout.status,
    country: payout.partner.country,
    amount: payout.amount,
  }));

  console.table(finalPayouts);
  console.log(`Total eligible payouts: ${finalPayouts.length}`);
  console.log(
    `Total eligble payout amount: ${currencyFormatter(finalPayouts.reduce((acc, payout) => acc + payout.amount, 0))}`,
  );
}

main();
