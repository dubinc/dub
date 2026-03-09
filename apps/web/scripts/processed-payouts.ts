import { MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.PayoutWhereInput = {
    status: "processed",
    amount: {
      gte: MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS,
    },
    partner: {
      payoutsEnabledAt: {
        not: null,
      },
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
