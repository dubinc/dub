import { prisma } from "@/lib/prisma";
import { currencyFormatter } from "@dub/utils";
import { Prisma } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.PayoutWhereInput = {
    program: {
      environment: "production",
    },
    status: {
      in: ["processed", "processing"],
    },
  };

  const totals = await prisma.payout.aggregate({
    where,
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
  });

  console.log({
    totalProcessedPayouts: totals._count.id,
    totalProcessedPayoutsAmount: currencyFormatter(totals._sum?.amount ?? 0),
  });

  const processedPayouts = await prisma.payout.findMany({
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
    processedPayouts.map((payout) => ({
      id: payout.id,
      partner: payout.partner.email,
      amount: currencyFormatter(payout.amount),
      paidAt: payout.paidAt,
    })),
  );
}

main();
