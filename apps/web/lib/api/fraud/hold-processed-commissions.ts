import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { chunk, groupBy } from "@dub/utils";
import {
  CommissionStatus,
  PayoutStatus,
  Prisma,
  ProgramEnrollment,
} from "@prisma/client";
import { syncTotalCommissions } from "../partners/sync-total-commissions";

// Bulk-hold processed commissions for partner-program pairs flagged by partner-level fraud
// (duplicate identity, duplicate payout method, cross-program ban).
export async function holdProcessedCommissions(
  programEnrollments: Pick<ProgramEnrollment, "programId" | "partnerId">[],
) {
  if (programEnrollments.length === 0) {
    console.log("No program enrollments to hold processed commissions for");
    return;
  }

  const uniquePairs = [
    ...new Map(
      programEnrollments.map((e) => [`${e.programId}:${e.partnerId}`, e]),
    ).values(),
  ];

  const chunks = chunk(uniquePairs, 50);

  const holdEligibleWhere: Prisma.CommissionWhereInput = {
    status: CommissionStatus.processed,
    payout: {
      status: PayoutStatus.pending,
    },
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

  const payoutIdsToRetallySet = new Set<string>();

  for (const chunk of chunks) {
    while (true) {
      const processedCommissions = await prisma.commission.findMany({
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
          payoutId: true,
          program: {
            select: {
              id: true,
              workspaceId: true,
            },
          },
        },
        take: 250,
      });

      if (processedCommissions.length === 0) {
        console.log("No more processed commissions to hold, breaking...");
        break;
      }

      // add payout IDs to retally for later
      for (const { payoutId } of processedCommissions) {
        if (payoutId) payoutIdsToRetallySet.add(payoutId);
      }

      // Update the status of the commissions to hold
      const { count: updatedCount } = await prisma.commission.updateMany({
        where: {
          id: {
            in: processedCommissions.map((c) => c.id),
          },
          ...holdEligibleWhere,
        },
        data: {
          status: CommissionStatus.hold,
          payoutId: null,
        },
      });

      if (updatedCount === 0) {
        console.log("No commissions updated to hold, breaking...");
        break;
      }

      console.log(`Updated ${updatedCount} commissions to hold`);

      // updateMany re-checks eligibility, so a commission's status can change between findMany
      // and updateMany (i.e. if their associated payout is updated). Only log/sync rows we actually held.
      let heldCommissions = processedCommissions;

      if (updatedCount < processedCommissions.length) {
        const processedCommissionIds = processedCommissions.map((c) => c.id);

        const heldCommissionIds = await prisma.commission.findMany({
          where: {
            id: {
              in: processedCommissionIds,
            },
            status: CommissionStatus.hold,
          },
          select: {
            id: true,
          },
        });

        const heldIds = new Set(heldCommissionIds.map(({ id }) => id));

        heldCommissions = processedCommissions.filter((c) => heldIds.has(c.id));
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

      await Promise.allSettled(
        affectedPairs.map(({ programId, partnerId }) =>
          syncTotalCommissions({
            programId,
            partnerId,
          }),
        ),
      );
    }
  }

  // need to retally payouts to ensure the payout amount is correct
  await retallyPayoutsAmount(Array.from(payoutIdsToRetallySet));
}
