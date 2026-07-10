import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { prisma } from "@/lib/prisma";
import { CommissionStatus } from "@prisma/client";

// release all hold commissions for a given program (downgrading from Advanced -> Business)
export async function releaseAllHoldCommissions({
  programId,
}: {
  programId: string;
}) {
  let totalReleased = 0;

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

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        workspaceId: true,
      },
    });

    const partnerIds = Array.from(
      new Set(commissionsToRelease.map((c) => c.partnerId)),
    );

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
      triggerAggregateDueCommissionsCronJob(programId),
      ...partnerIds.map((partnerId) =>
        syncTotalCommissions({
          partnerId,
          programId,
        }),
      ),
    ]);

    console.log(
      `Summary of releaseAllHoldCommissions: ${JSON.stringify(
        ["trackCommissionStatusUpdate", "triggerAggregateDueCommissions"].map(
          (step, index) => ({
            step,
            result: results[index],
          }),
        ),
      )}`,
    );
  }

  return totalReleased;
}
