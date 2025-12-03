import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { FraudRuleType } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  await createFraudEvents([
    {
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      partnerId: "pn_1KBEWWFYZ675D05AWWJVAPQEK",
      type: FraudRuleType.partnerFraudReport,
    },
    {
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      partnerId: "pn_1KBEWWFYZBKDWGXQBZSSXK88C",
      type: FraudRuleType.partnerFraudReport,
    },
  ]);
}

main();
