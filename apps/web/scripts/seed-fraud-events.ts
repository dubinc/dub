import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const type = "partnerDuplicatePayoutMethod";

  await createFraudEvents([
    {
      programId,
      partnerId: "pn_1KANAX74GSBZK1TEP52BFWT6R",
      type,
    },
    {
      programId,
      partnerId: "pn_1KANAX74GJXZSWXCCBP57P0GM",
      type,
    },
  ]);
}

main();

// case "partnerCrossProgramBan":
//   case "partnerDuplicatePayoutMethod":
//   case "partnerFraudReport":
