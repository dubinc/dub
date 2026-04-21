import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@dub/prisma";
import type { Prisma } from "@dub/prisma/client";
import {
  isWorkspaceBillingTrialActive,
  TRIAL_PROGRAM_ENROLLMENT_LIMIT,
} from "@dub/utils";

/**
 * Limits total enrollments per program while the workspace billing trial is active.
 * Pass `trialEndsAt` from an already-loaded workspace so non-trial paths skip the count query.
 * Pass `tx` when calling inside `prisma.$transaction` so the count and enrollment write are atomic.
 */
export async function throwIfTrialProgramEnrollmentLimitExceeded({
  programId,
  additionalEnrollments = 1,
  trialEndsAt,
  tx,
}: {
  programId: string;
  additionalEnrollments?: number;
  trialEndsAt: Date | null | undefined;
  tx?: Prisma.TransactionClient;
}) {
  if (!isWorkspaceBillingTrialActive(trialEndsAt)) {
    console.log(
      "Workspace is not on a billing trial, skipping enrollment limit check...",
    );
    return;
  }

  const db = tx ?? prisma;

  const totalEnrollments = await db.programEnrollment.count({
    where: {
      programId,
    },
  });

  if (
    totalEnrollments + additionalEnrollments >
    TRIAL_PROGRAM_ENROLLMENT_LIMIT
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: `During your free trial you can have at most ${TRIAL_PROGRAM_ENROLLMENT_LIMIT} partners in your program. Start a paid plan to add more.`,
    });
  }
}
