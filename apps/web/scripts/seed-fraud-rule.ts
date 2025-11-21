import { createId } from "@/lib/api/create-id";
import { createFraudEventGroupKey } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  await prisma.fraudEvent.createMany({
    data: [
      {
        id: createId({ prefix: "fre_" }),
        programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
        partnerId: "pn_1K9BZE1K2FNB4639HXV9QQNPP",
        customerId: "cus_1K9RNVZV97VFS6FVWWZM52KXJ",
        type: "paidTrafficDetected",
        metadata: {
          source: "google",
        },
        groupKey: createFraudEventGroupKey({
          programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
          partnerId: "pn_1K9BZE1K2FNB4639HXV9QQNPP",
          type: "paidTrafficDetected",
        }),
      },
      {
        id: createId({ prefix: "fre_" }),
        programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
        partnerId: "pn_1K9BZE1K2WM4AY6SW0FW7R4PQ",
        customerId: "cus_1K9RNWACFQMTRH3NPXBEZ4K0X",
        type: "paidTrafficDetected",
        metadata: {
          source: "facebook",
        },
        groupKey: createFraudEventGroupKey({
          programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
          partnerId: "pn_1K9BZE1K2WM4AY6SW0FW7R4PQ",
          type: "paidTrafficDetected",
        }),
      },
    ],
  });
}

main();
