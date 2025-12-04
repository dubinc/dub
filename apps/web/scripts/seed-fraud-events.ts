import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import "dotenv-flow/config";

async function main() {
  await detectDuplicatePayoutMethodFraud("2");
}

main();
