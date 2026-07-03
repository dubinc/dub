import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
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
    const { count } = await prisma.commission.updateMany({
      where: {
        OR: chunk.map(({ programId, partnerId }) => ({
          programId,
          partnerId,
        })),
        status: CommissionStatus.pending,
      },
      data: {
        status: CommissionStatus.hold,
      },
    });

    if (count > 0) {
      await Promise.all(
        uniquePairs.map(({ programId, partnerId }) =>
          syncTotalCommissions({
            programId,
            partnerId,
          }),
        ),
      );
    }
  }
}
