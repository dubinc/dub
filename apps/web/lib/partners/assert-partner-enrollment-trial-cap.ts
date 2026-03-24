import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@dub/prisma";
import {
  isWorkspaceBillingTrialActive,
  TRIAL_PARTNER_ENROLLMENT_CAP,
} from "@dub/utils";

/**
 * Caps approved enrollments per program while the workspace billing trial is active.
 * Pass `trialEndsAt` from an already-loaded workspace so non-trial paths skip the count query.
 */
export async function throwIfPartnerEnrollmentTrialCapExceeded({
  programId,
  additionalApproved = 1,
  trialEndsAt,
}: {
  programId: string;
  additionalApproved?: number;
  trialEndsAt: Date | null | undefined;
}) {
  if (!isWorkspaceBillingTrialActive(trialEndsAt)) {
    return;
  }

  const approvedCount = await prisma.programEnrollment.count({
    where: {
      programId,
      status: "approved",
    },
  });

  if (approvedCount + additionalApproved > TRIAL_PARTNER_ENROLLMENT_CAP) {
    throw new DubApiError({
      code: "forbidden",
      message: `During your free trial you can have at most ${TRIAL_PARTNER_ENROLLMENT_CAP} enrolled partners. Upgrade to add more.`,
    });
  }
}
