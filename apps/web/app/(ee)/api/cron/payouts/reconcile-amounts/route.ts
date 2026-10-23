import { reconcilePayoutAmounts } from "@/lib/api/commissions/reconcile-payout-amounts";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { withRedisLock } from "@/lib/upstash/redis-lock";
import { PayoutStatus } from "@prisma/client";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 500;
const LOOKBACK_MINUTES = 2;
const LOCK_TTL_SECONDS = 60;

// Finds recently updated pending payouts whose amount does not match
// SUM(commission.earnings) and reconciles them (update amount or delete empty payouts)
// Runs every minute (cron expression: * * * * *)
// GET /api/cron/payouts/reconcile-amounts
export const GET = withCron(async () => {
  const response = await withRedisLock({
    key: "lock:payouts:reconcile-amounts",
    ttlSeconds: LOCK_TTL_SECONDS,
    fn: async () => {
      const updatedAfter = subMinutes(new Date(), LOOKBACK_MINUTES);
      let startingAfter: string | undefined;
      let scanned = 0;
      let fixed = 0;

      while (true) {
        const payouts = await prisma.payout.findMany({
          where: {
            updatedAt: {
              gte: updatedAfter,
            },
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
          if (scanned === 0) {
            return logAndRespond("No recently updated pending payouts found.");
          }

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
          await reconcilePayoutAmounts(
            mismatches.map((mismatch) => mismatch.id),
          );
          fixed += mismatches.length;
        }

        if (payouts.length < BATCH_SIZE) {
          break;
        }

        startingAfter = payouts[payouts.length - 1].id;
      }

      return logAndRespond(
        `Finished reconciling payout amounts. Scanned ${scanned} recently updated payout(s), fixed ${fixed} mismatch(es).`,
      );
    },
  });

  if (!response) {
    return logAndRespond(
      "[reconcile-amounts] Another run is in progress. Skipping...",
    );
  }

  return response;
});
