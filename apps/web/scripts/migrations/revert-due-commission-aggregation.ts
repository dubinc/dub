import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const programsByHoldingPeriod = await prisma.program.groupBy({
    by: ["holdingPeriodDays"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  for (const { holdingPeriodDays } of programsByHoldingPeriod) {
    if (holdingPeriodDays === 0) {
      console.log("no need to process for program with holding period days: 0");
      continue;
    }
    const programs = await prisma.program.findMany({
      where: {
        holdingPeriodDays,
      },
      select: {
        id: true,
        name: true,
      },
    });
    const shouldBePendingCommissions = await prisma.commission.findMany({
      where: {
        status: "processed",
        programId: {
          in: programs.map((p) => p.id),
        },
        type: {
          not: "custom",
        },
        createdAt: {
          gte: new Date(Date.now() - holdingPeriodDays * 24 * 60 * 60 * 1000),
        },
      },
      take: 5000,
    });
    console.log(
      `Found ${shouldBePendingCommissions.length} should be pending commissions for programs with holding period days: ${holdingPeriodDays}`,
    );
    const res = await prisma.commission.updateMany({
      where: {
        id: {
          in: shouldBePendingCommissions.map((c) => c.id),
        },
      },
      data: {
        status: "pending",
        payoutId: null,
      },
    });
    console.log(`Updated ${res.count} commissions to have status "pending"`);
    const payoutsToUpdate = shouldBePendingCommissions.reduce(
      (acc, commission) => {
        if (commission.payoutId) {
          acc.push(commission.payoutId);
        }
        return acc;
      },
      [] as string[],
    );
    console.log(`Payouts to update: ${payoutsToUpdate.join(", ")}`);
    const groupedByPayouts = await prisma.commission.groupBy({
      by: ["payoutId"],
      where: {
        status: "processed",
        payoutId: {
          in: payoutsToUpdate,
        },
      },
      _sum: {
        earnings: true,
      },
    });

    console.log(
      `Grouped by payouts: ${JSON.stringify(groupedByPayouts, null, 2)}`,
    );
    const chunks = chunk(groupedByPayouts, 50);
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async ({ payoutId, _sum }) => {
          if (!payoutId || !_sum.earnings) {
            console.log(
              `Missing values: ${JSON.stringify({ payoutId, _sum }, null, 2)}`,
            );
            return;
          }
          await prisma.payout.update({
            where: { id: payoutId },
            data: {
              amount: _sum.earnings,
            },
          });
          console.log(
            `Updated payout ${payoutId} with amount ${_sum.earnings}`,
          );
        }),
      );
    }

    const emptyPayoutsToDelete = payoutsToUpdate.filter((payoutId) => {
      const payout = groupedByPayouts.find((p) => p.payoutId === payoutId);
      return !payout || payout._sum.earnings === 0;
    });
    const deletedPayouts = await prisma.payout.deleteMany({
      where: {
        id: {
          in: emptyPayoutsToDelete,
        },
      },
    });
    console.log(`Deleted ${deletedPayouts.count} payouts with no commissions`);
  }
}

main();
