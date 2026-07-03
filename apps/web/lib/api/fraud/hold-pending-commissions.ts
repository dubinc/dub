import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { prisma } from "@/lib/prisma";
import { chunk, groupBy } from "@dub/utils";
import { CommissionStatus, ProgramEnrollment } from "@prisma/client";
import { syncTotalCommissions } from "../partners/sync-total-commissions";

export async function holdPendingCommissions(
  programEnrollments: Pick<ProgramEnrollment, "programId" | "partnerId">[],
) {
  if (programEnrollments.length === 0) {
    return;
  }

  const uniquePairs = [
    ...new Map(
      programEnrollments.map((e) => [`${e.programId}:${e.partnerId}`, e]),
    ).values(),
  ];

  const chunks = chunk(uniquePairs, 50);

  for (const chunk of chunks) {
    const commissionsToHold = await prisma.commission.findMany({
      where: {
        OR: chunk.map(({ programId, partnerId }) => ({
          programId,
          partnerId,
        })),
        status: CommissionStatus.pending,
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
            workspaceId: true,
          },
        },
      },
    });

    if (commissionsToHold.length === 0) {
      continue;
    }

    await prisma.commission.updateMany({
      where: {
        id: {
          in: commissionsToHold.map((c) => c.id),
        },
      },
      data: {
        status: CommissionStatus.hold,
      },
    });

    const commissionsByProgram = groupBy(commissionsToHold, (c) => c.programId);

    for (const commissions of Object.values(commissionsByProgram)) {
      await trackCommissionStatusUpdate({
        workspaceId: commissions[0].program.workspaceId,
        programId: commissions[0].programId,
        commissions,
        newStatus: CommissionStatus.hold,
      });
    }

    const affectedPairs = [
      ...new Map(
        commissionsToHold.map((c) => [
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
