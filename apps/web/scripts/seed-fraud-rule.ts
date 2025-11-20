import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  await prisma.fraudEvent.createMany({
    data: [
      {
        id: createId({ prefix: "fraud_" }),
        programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
        partnerId: "pn_1K9BZE1K2WM4AY6SW0FW7R4PQ",
        customerId: "cus_1K9RNVZV97VFS6FVWWZM52KXJ",
        type: "customerEmailMatch",
      },

      {
        id: createId({ prefix: "fraud_" }),
        programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
        partnerId: "pn_1K9BZE1K2WM4AY6SW0FW7R4PQ",
        customerId: "cus_1K9RNWACFQMTRH3NPXBEZ4K0X",
        type: "customerEmailMatch",
      },
    ],
  });
}

main();
