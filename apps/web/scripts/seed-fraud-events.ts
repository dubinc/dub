import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const type = "partnerDuplicatePayoutMethod";

  const id1 = nanoid(10);
  const id2 = nanoid(10);

  await createFraudEvents([
    {
      programId,
      partnerId: "pn_1KANAX74GSBZK1TEP52BFWT6R",
      type,
      metadata: {
        payoutMethodHash: id1,
      },
    },
    {
      programId,
      partnerId: "pn_1KANAX74GJXZSWXCCBP57P0GM",
      type,
      metadata: {
        payoutMethodHash: id1,
      },
    },
  ]);

  await createFraudEvents([
    {
      programId,
      partnerId: "pn_1KANAX74GWAVTQ0GW8H2HEG6E",
      type,
      metadata: {
        payoutMethodHash: id2,
      },
    },
    {
      programId,
      partnerId: "pn_1KANAX74GSBZK1TEP52BFWT6R",
      type,
      metadata: {
        payoutMethodHash: id2,
      },
    },
  ]);
}

main();

// case "partnerCrossProgramBan":
//   case "partnerDuplicatePayoutMethod":
//   case "partnerFraudReport":
