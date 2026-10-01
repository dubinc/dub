import { prisma } from "@/lib/prisma";
import { Prisma, ProgramApplicationStatus } from "@prisma/client";

// Keeps the application in sync when its enrollment is promoted to approved
// outside the review flow (e.g. account merges, partner imports). Applications
// that are already approved are skipped so their original review is preserved.
export async function approveLinkedApplication({
  applicationId,
  userId,
  tx,
}: {
  applicationId: string | null;
  userId?: string;
  tx?: Prisma.TransactionClient;
}) {
  if (!applicationId) {
    return;
  }

  await (tx ?? prisma).programApplication.updateMany({
    where: {
      id: applicationId,
      status: {
        not: ProgramApplicationStatus.approved,
      },
    },
    data: {
      status: ProgramApplicationStatus.approved,
      reviewedAt: new Date(),
      rejectionReason: null,
      rejectionNote: null,
      ...(userId && { userId }),
    },
  });
}
