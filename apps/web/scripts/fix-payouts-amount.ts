import { prisma } from "@/lib/prisma";
import { PayoutStatus } from "@prisma/client";
import "dotenv-flow/config";
import { reconcilePayoutAmounts } from "../lib/api/commissions/reconcile-payout-amounts";

const BATCH_SIZE = 500;

async function main() {
  let startingAfter: string | undefined;
  let scanned = 0;
  let fixed = 0;

  while (true) {
    const payouts = await prisma.payout.findMany({
      where: {
        status: PayoutStatus.pending,
        ...(startingAfter && {
          id: {
            gt: startingAfter,
          },
        }),
      },
      select: {
        id: true,
        amount: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (payouts.length === 0) {
      console.log(`Scanned ${scanned} payouts, fixed ${fixed} mismatches`);
      break;
    }

    scanned += payouts.length;

    const aggregates = await prisma.commission.groupBy({
      by: ["payoutId"],
      where: {
        payoutId: {
          in: payouts.map((payout) => payout.id),
        },
      },
      _sum: {
        earnings: true,
      },
    });

    const commissionSumByPayoutId = new Map(
      aggregates.map((a) => [a.payoutId!, a._sum.earnings ?? 0]),
    );

    const mismatches: {
      id: string;
      payoutAmount: number;
      commissionSum: number;
      diff: number;
    }[] = [];

    for (const payout of payouts) {
      const commissionSum = commissionSumByPayoutId.get(payout.id) ?? 0;

      if (payout.amount !== commissionSum) {
        mismatches.push({
          id: payout.id,
          payoutAmount: payout.amount,
          commissionSum,
          diff: payout.amount - commissionSum,
        });
      }
    }

    if (mismatches.length > 0) {
      console.table(mismatches);
      await reconcilePayoutAmounts(mismatches.map((mismatch) => mismatch.id));
      fixed += mismatches.length;
    }

    startingAfter = payouts[payouts.length - 1].id;
  }
}

main();
