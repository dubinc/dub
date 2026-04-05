import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@dub/prisma";
import type { Prisma } from "@dub/prisma/client";
import {
  isWorkspaceBillingTrialActive,
  TRIAL_PROGRAM_ENROLLMENT_LIMIT,
} from "@dub/utils";

/**
 * Limits approved enrollments per program while the workspace billing trial is active.
 * Pass `trialEndsAt` from an already-loaded workspace so non-trial paths skip the count query.
 * Pass `tx` when calling inside `prisma.$transaction` so the count and approval write are atomic.
 */
export async function throwIfTrialProgramEnrollmentLimitExceeded({
  programId,
  additionalApproved = 1,
  trialEndsAt,
  tx,
}: {
  programId: string;
  additionalApproved?: number;
  trialEndsAt: Date | null | undefined;
  tx?: Prisma.TransactionClient;
}) {
  if (!isWorkspaceBillingTrialActive(trialEndsAt)) {
    return;
  }

  const db = tx ?? prisma;

  const approvedCount = await db.programEnrollment.count({
    where: {
      programId,
      status: "approved",
    },
  });

  if (approvedCount + additionalApproved > TRIAL_PROGRAM_ENROLLMENT_LIMIT) {
    throw new DubApiError({
      code: "forbidden",
      message: `During your free trial you can have at most ${TRIAL_PROGRAM_ENROLLMENT_LIMIT} enrolled partners. Upgrade to add more.`,
    });
  }
}
