import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { createId } from "@/lib/api/create-id";
import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import {
  Commission,
  CommissionStatus,
  Payout,
  PayoutStatus,
  Prisma,
  Program,
} from "@prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

const inputSchema = z.object({
  programId: z.string(),
});

// POST /api/cron/payouts/aggregate-due-commissions/process
export const POST = withCron(async ({ rawBody }) => {
  const { programId } = inputSchema.parse(JSON.parse(rawBody));

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      name: true,
      workspaceId: true,
    },
  });

  if (!program) {
    return logAndRespond(`Program ${programId} not found. Skipping...`);
  }

  const partnerGroupsByHoldingPeriod = await prisma.partnerGroup.groupBy({
    by: ["holdingPeriodDays"],
    where: {
      programId,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  for (const { holdingPeriodDays } of partnerGroupsByHoldingPeriod) {
    const partnerGroups = await prisma.partnerGroup.findMany({
      where: {
        holdingPeriodDays,
        programId,
      },
      select: {
        id: true,
      },
    });

    console.log(
      `Found ${partnerGroups.length} partner groups with holding period days: ${holdingPeriodDays}`,
    );

    while (true) {
      const dueCommissions = await prisma.commission.findMany({
        where: {
          programId,
          status: CommissionStatus.pending,
          programEnrollment: {
            groupId: {
              in: partnerGroups.map((p) => p.id),
            },
          },
          // If holding period days is greater than 0:
          // we only process commissions that were created before the holding period
          // but custom commissions are always included
          ...(holdingPeriodDays > 0
            ? {
                OR: [
                  {
                    type: {
                      // includes manual + referral commissions + clawbacks
                      in: ["custom", "referral"],
                    },
                  },
                  {
                    createdAt: {
                      lt: new Date(
                        Date.now() - holdingPeriodDays * 24 * 60 * 60 * 1000,
                      ),
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          createdAt: true,
          amount: true,
          earnings: true,
          status: true,
          partnerId: true,
          programId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: BATCH_SIZE,
      });

      if (dueCommissions.length === 0) {
        console.log(
          `No more due commissions found for partner groups with holding period days: ${holdingPeriodDays}. Skipping...`,
        );
        break;
      }

      console.log(
        `Found ${dueCommissions.length} due commissions for partner groups with holding period days: ${holdingPeriodDays}`,
      );

      const commissionsByPartner = dueCommissions.reduce<
        Record<string, typeof dueCommissions>
      >((acc, commission) => {
        if (!acc[commission.partnerId]) {
          acc[commission.partnerId] = [];
        }
        acc[commission.partnerId].push(commission);
        return acc;
      }, {});

      const partnersWithCommissions = Object.entries(commissionsByPartner).map(
        ([partnerId, commissions]) => ({ partnerId, commissions }),
      );

      let totalProcessed = 0;
      const partnerBatches = chunk(partnersWithCommissions, 50);

      for (let i = 0; i < partnerBatches.length; i++) {
        const partnerChunk = partnerBatches[i];

        const existingPendingPayouts = await prisma.payout.findMany({
          where: {
            programId,
            partnerId: {
              in: partnerChunk.map(({ partnerId }) => partnerId),
            },
            status: PayoutStatus.pending,
          },
          select: {
            id: true,
            partnerId: true,
          },
        });

        const pendingPayoutByPartnerId = new Map(
          existingPendingPayouts.map((payout) => [payout.partnerId, payout]),
        );

        const results = await Promise.allSettled(
          partnerChunk.map(({ partnerId, commissions }) =>
            aggregateDueCommissionsForPartner({
              partnerId,
              program,
              commissions,
              existingPendingPayout: pendingPayoutByPartnerId.get(partnerId),
            }),
          ),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            totalProcessed++;
          } else if (result.status === "rejected") {
            console.error(
              `Failed to aggregate due commissions for partner:`,
              result.reason,
            );
          }
        }

        console.log(`Processed chunk ${i + 1} of ${partnerBatches.length}`);
      }

      const successRate =
        (totalProcessed / partnersWithCommissions.length) * 100;

      console.log(
        `Processed ${totalProcessed}/${partnersWithCommissions.length} partners with due commissions for partner groups with holding period days: ${holdingPeriodDays} (${successRate.toFixed(1)}% success rate)`,
      );

      if (totalProcessed === 0) {
        console.log(
          `No partners were processed for holding period days: ${holdingPeriodDays}.`,
        );
        break;
      }
    }
  }

  return logAndRespond(
    "Finished aggregating due commissions into payouts for all batches.",
  );
});

async function aggregateDueCommissionsForPartner({
  partnerId,
  program,
  commissions,
  existingPendingPayout,
}: {
  partnerId: string;
  program: Pick<Program, "id" | "name" | "workspaceId">;
  commissions: Pick<
    Commission,
    "id" | "createdAt" | "amount" | "earnings" | "status"
  >[];
  existingPendingPayout?: Pick<Payout, "id" | "partnerId">;
}): Promise<boolean> {
  // Sort the commissions by createdAt
  const sortedCommissions = commissions.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const commissionIds = sortedCommissions.map((c) => c.id);
  const periodStart = sortedCommissions[0].createdAt;
  const periodEnd = sortedCommissions[sortedCommissions.length - 1].createdAt;

  let payoutToUse = existingPendingPayout
    ? { id: existingPendingPayout.id }
    : null;

  const isReusingPendingPayout = !!payoutToUse;

  if (!payoutToUse) {
    // Amount starts at 0 and is set from actually-claimed commissions below
    payoutToUse = await prisma.payout.create({
      data: {
        id: createId({ prefix: "po_" }),
        programId: program.id,
        partnerId,
        periodStart,
        periodEnd,
        amount: 0,
        description: `Dub Partners payout (${program.name})`,
      },
      select: {
        id: true,
      },
    });
  }

  // Use raw SQL instead of prisma.commission.updateMany.
  // Prisma has a reported MySQL issue where updateMany may drop WHERE predicates
  // during the UPDATE, allowing concurrent workers to claim the same commissions.
  // See: https://github.com/prisma/prisma/issues/28840
  // Also join Payout so we never attach to a payout that left a mutable status
  // (e.g. confirmed to processing between prefetch and claim).
  const updatedCommissions = await prisma.$executeRaw`
    UPDATE Commission c
    INNER JOIN Payout p ON p.id = ${payoutToUse.id}
    SET
      c.status = ${CommissionStatus.processed},
      c.payoutId = ${payoutToUse.id},
      c.updatedAt = NOW()
    WHERE c.id IN (${Prisma.join(commissionIds)})
      AND c.programId = ${program.id}
      AND c.partnerId = ${partnerId}
      AND c.status = ${CommissionStatus.pending}
      AND p.status IN (${Prisma.join(MUTABLE_PAYOUT_STATUSES)})
  `;

  if (updatedCommissions === 0) {
    console.warn(
      `No commissions were updated for partner ${partnerId}. Skipping...`,
    );

    // Lost race (claim or payout no longer mutable) — only delete if still empty.
    if (!isReusingPendingPayout) {
      await prisma.payout.deleteMany({
        where: {
          id: payoutToUse.id,
          commissions: {
            none: {},
          },
        },
      });
    }

    return false;
  }

  // Always set amount from DB after claim (create + reuse) so partial claims
  // and concurrent attaches cannot leave a stale precomputed sum.
  const {
    _sum: { earnings: totalEarningsForPayout },
  } = await prisma.commission.aggregate({
    where: {
      payoutId: payoutToUse.id,
    },
    _sum: {
      earnings: true,
    },
  });

  // Raw SQL: Prisma updateMany also drops status predicates on MySQL.
  const updatedPayout = await prisma.$executeRaw`
    UPDATE Payout
    SET
      amount = ${totalEarningsForPayout ?? 0},
      periodEnd = COALESCE(${isReusingPendingPayout ? periodEnd : null}, periodEnd),
      updatedAt = NOW()
    WHERE id = ${payoutToUse.id}
      AND status IN (${Prisma.join(MUTABLE_PAYOUT_STATUSES)})
  `;

  if (updatedPayout === 0) {
    console.warn(
      `Payout ${payoutToUse.id} is no longer mutable after claim for partner ${partnerId}. Skipping...`,
    );
    return false;
  }

  // Only activity-log commissions we actually claimed (handles partial races).
  const claimedCommissions = await prisma.commission.findMany({
    where: {
      id: {
        in: commissionIds,
      },
      payoutId: payoutToUse.id,
      status: CommissionStatus.processed,
    },
    select: {
      id: true,
      amount: true,
      earnings: true,
      status: true,
    },
  });

  await trackCommissionStatusUpdate({
    workspaceId: program.workspaceId,
    programId: program.id,
    commissions: claimedCommissions,
    newStatus: CommissionStatus.processed,
  });

  return true;
}
