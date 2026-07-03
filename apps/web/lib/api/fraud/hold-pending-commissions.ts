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
    const pendingCommissions = await prisma.commission.findMany({
      where: {
        OR: chunk.map(({ programId, partnerId }) => ({
          programId,
          partnerId,
        })),
        status: CommissionStatus.pending,
        earnings: {
          gt: 0,
        },
        // Only hold commissions for workspaces whose plan can manage fraud events,
        // Other plans have no way to review or resolve fraud groups, so their commissions should never be frozen.
        program: {
          workspace: {
            plan: {
              in: ["enterprise", "advanced"],
            },
          },
        },
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

    if (pendingCommissions.length === 0) {
      continue;
    }

    await prisma.commission.updateMany({
      where: {
        id: {
          in: pendingCommissions.map((c) => c.id),
        },
      },
      data: {
        status: CommissionStatus.hold,
      },
    });

    const commissionsByProgram = groupBy(
      pendingCommissions,
      (c) => c.programId,
    );

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
        pendingCommissions.map((c) => [
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
