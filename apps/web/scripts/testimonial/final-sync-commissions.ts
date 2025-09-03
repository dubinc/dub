import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

// update commissions for a program
async function main() {
  const where: Prisma.CommissionWhereInput = {
    programId: "prog_xxx",
    payoutId: {
      not: null,
    },
    status: "processed",
  };

  const payoutsStats = await prisma.commission.groupBy({
    by: ["payoutId"],
    where,
    _count: true,
    _sum: {
      earnings: true,
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
  });
  console.log(payoutsStats);

  const actualPayouts = await prisma.payout.findMany({
    where: {
      id: {
        in: payoutsStats.map((payout) => payout.payoutId!),
      },
    },
    select: {
      id: true,
      amount: true,
    },
  });

  for (const payout of actualPayouts) {
    const payoutStats = payoutsStats.find(
      (payoutStat) => payoutStat.payoutId === payout.id,
    );
    if (!payoutStats) {
      console.log(`Payout ${payout.id} not found in payoutsStats`);
      continue;
    }
    if (payoutStats._sum.earnings !== payout.amount) {
      console.log(
        `Payout ${payout.id} has a mismatch, updating payout and commissions`,
      );
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          amount: payoutStats._sum.earnings ?? 0,
        },
      });
    }
  }
}

main();
