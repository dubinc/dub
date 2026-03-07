import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.PayoutWhereInput = {
    status: "processed",
    amount: {
      gt: 0,
    },
    partner: {
      payoutsEnabledAt: {
        not: null,
      },
    },
  };

  const processedPayouts = await prisma.payout.aggregate({
    where,
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

  const listOfPayouts = await prisma.payout.findMany({
    where,
    include: {
      partner: {
        select: {
          email: true,
        },
      },
    },
    take: 100,
    orderBy: {
      paidAt: "asc",
    },
  });

  console.table(
    listOfPayouts.map((payout) => ({
      id: payout.id,
      partner: payout.partner.email,
      amount: currencyFormatter(payout.amount),
      paidAt: payout.paidAt,
    })),
  );
}

main();
