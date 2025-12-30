import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const processedPayouts = await prisma.payout.aggregate({
    where: {
      status: "processed",
      partner: {
        paypalEmail: null,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
  });

  console.log({
    count: processedPayouts._count.id,
    amount: currencyFormatter(processedPayouts._sum.amount ?? 0),
  });
}

main();
