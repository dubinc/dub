import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import { CommissionStatus } from "@prisma/client";

// release all hold commissions for a given program (downgrading from Advanced -> Business)
export async function releaseAllHoldCommissions({
  programId,
}: {
  programId: string;
}) {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      workspaceId: true,
    },
  });

  if (!program) {
    console.log(
      `Program ${programId} not found, skipping hold commission release`,
    );
    return 0;
  }

  let totalReleased = 0;
  const partnerIdsToSync = new Set<string>();

  try {
    while (true) {
      const commissionsToRelease = await prisma.commission.findMany({
        where: {
          programId,
          status: CommissionStatus.hold,
        },
        select: {
          id: true,
          amount: true,
          earnings: true,
          status: true,
          partnerId: true,
        },
        take: PRISMA_UPDATEMANY_LIMIT,
      });

      if (commissionsToRelease.length === 0) {
        console.log(`No hold commissions to release for program ${programId}`);
        break;
      }

      // Update the commissions to pending
      const { count: updatedCount } = await prisma.commission.updateMany({
        where: {
          id: {
            in: commissionsToRelease.map((c) => c.id),
          },
          status: CommissionStatus.hold,
        },
        data: {
          status: CommissionStatus.pending,
        },
      });

      if (updatedCount === 0) {
        console.log(`No hold commissions to release for program ${programId}`);
        break;
      }

      totalReleased += updatedCount;

      commissionsToRelease.forEach((c) => partnerIdsToSync.add(c.partnerId));

      // Get the released commissions
      const releasedCommissions =
        updatedCount < commissionsToRelease.length
          ? await prisma.commission
              .findMany({
                where: {
                  id: {
                    in: commissionsToRelease.map((c) => c.id),
                  },
                  status: CommissionStatus.pending,
                },
                select: {
                  id: true,
                  amount: true,
                  earnings: true,
                  status: true,
                },
              })
              .then((commissions) =>
                commissions.map((c) => ({
                  ...c,
                  // need to make sure the releasedCommissions have the old "hold" status for the status update log
                  status: CommissionStatus.hold,
                })),
              )
          : commissionsToRelease;

      const results = await Promise.allSettled([
        trackCommissionStatusUpdate({
          workspaceId: program.workspaceId,
          programId,
          commissions: releasedCommissions,
          newStatus: CommissionStatus.pending,
        }),
      ]);

      console.log(
        `Summary of releaseAllHoldCommissions: ${JSON.stringify(
          ["trackCommissionStatusUpdate"].map((step, index) => ({
            step,
            result: results[index],
          })),
        )}`,
      );
    }
  } finally {
    // Each partner is synced once here instead of once per pass.
    for (const partnerIds of chunk([...partnerIdsToSync], 100)) {
      const results = await Promise.allSettled(
        partnerIds.map((partnerId) =>
          syncTotalCommissions({
            partnerId,
            programId,
          }),
        ),
      );

      const failedPartnerIds = partnerIds.filter(
        (_, index) => results[index].status === "rejected",
      );

      if (failedPartnerIds.length > 0) {
        console.error(
          `Failed to sync total commissions for partners ${failedPartnerIds.join(", ")} in program ${programId}`,
        );
      }
    }

    if (totalReleased > 0) {
      try {
        await triggerAggregateDueCommissionsCronJob(programId);
      } catch (error) {
        console.error(
          `Failed to trigger aggregate due commissions for program ${programId}`,
          error,
        );
      }
    }
  }

  return totalReleased;
}
