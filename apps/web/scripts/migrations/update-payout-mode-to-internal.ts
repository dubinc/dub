import { prisma } from "@dub/prisma/node";
import "dotenv-flow/config";

async function main() {
  const result = await prisma.payout.updateMany({
    where: {
      status: {
        not: "pending",
      },
    },
    data: {
      mode: "internal",
    },
  });

  console.log(`Updated ${result.count} payouts to mode 'internal'`);
}

main();
