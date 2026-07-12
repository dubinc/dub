import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { prisma } from "@/lib/prisma";
import { chunk, groupBy } from "@dub/utils";
import { CommissionStatus, Prisma, ProgramEnrollment } from "@prisma/client";
import { syncTotalCommissions } from "../partners/sync-total-commissions";

// Bulk-hold pending commissions for partner-program pairs flagged by partner-level fraud
// (duplicate identity, duplicate payout method, cross-program ban).
export async function holdPendingCommissions(
  programEnrollments: Pick<ProgramEnrollment, "programId" | "partnerId">[],
) {
  if (programEnrollments.length === 0) {
    console.log("No program enrollments to hold pending commissions for");
    return;
  }

  const uniquePairs = [
    ...new Map(
      programEnrollments.map((e) => [`${e.programId}:${e.partnerId}`, e]),
    ).values(),
  ];

  const chunks = chunk(uniquePairs, 50);

  const holdEligibleWhere: Prisma.CommissionWhereInput = {
    status: CommissionStatus.pending,
    earnings: {
      gt: 0,
    },
    program: {
      workspace: {
        plan: {
          in: ["enterprise", "advanced"],
        },
      },
    },
  };

  for (const chunk of chunks) {
    while (true) {
      const pendingCommissions = await prisma.commission.findMany({
        where: {
          OR: chunk.map(({ programId, partnerId }) => ({
            programId,
            partnerId,
          })),
          ...holdEligibleWhere,
        },
        select: {
          id: true,
          amount: true,
          earnings: true,
          status: true,
          programId: true,
          partnerId: true,
          program: {
            select: {
              id: true,
              workspaceId: true,
            },
          },
        },
        take: 250,
      });

      if (pendingCommissions.length === 0) {
        console.log("No more pending commissions to hold, breaking...");
        break;
      }

      // Update the status of the commissions to hold
      const { count: updatedCount } = await prisma.commission.updateMany({
        where: {
          id: {
            in: pendingCommissions.map((c) => c.id),
          },
          ...holdEligibleWhere,
        },
        data: {
          status: CommissionStatus.hold,
        },
      });

      if (updatedCount === 0) {
        console.log("No commissions updated to hold, breaking...");
        break;
      }

      console.log(`Updated ${updatedCount} commissions to hold`);

      // updateMany re-checks eligibility, so a commission's status can change between findMany
      // and updateMany (i.e. if they're aggregated to a payout). Only log/sync rows we actually held.
      let heldCommissions = pendingCommissions;

      if (updatedCount < pendingCommissions.length) {
        const pendingCommissionIds = pendingCommissions.map((c) => c.id);

        const heldCommissionIds = await prisma.commission.findMany({
          where: {
            id: {
              in: pendingCommissionIds,
            },
            status: CommissionStatus.hold,
          },
          select: {
            id: true,
          },
        });

        const heldIds = new Set(heldCommissionIds.map(({ id }) => id));

        heldCommissions = pendingCommissions.filter((c) => heldIds.has(c.id));
      }

      // Activity logs are scoped to a workspace + program, so batch by program.
      const commissionsByProgram = groupBy(heldCommissions, (c) => c.programId);

      for (const commissions of Object.values(commissionsByProgram)) {
        const { id: programId, workspaceId } = commissions[0].program;

        await trackCommissionStatusUpdate({
          workspaceId,
          programId,
          commissions,
          newStatus: CommissionStatus.hold,
        });
      }

      const affectedPairs = [
        ...new Map(
          heldCommissions.map((c) => [
            `${c.programId}:${c.partnerId}`,
            { programId: c.programId, partnerId: c.partnerId },
          ]),
        ).values(),
      ];

      await Promise.all(
        affectedPairs.map(({ programId, partnerId }) =>
          syncTotalCommissions({
            programId,
            partnerId,
          }),
        ),
      );
    }
  }
}
