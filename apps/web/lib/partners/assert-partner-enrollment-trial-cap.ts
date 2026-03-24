import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@dub/prisma";
import { TRIAL_PARTNER_ENROLLMENT_CAP } from "@dub/utils";

export async function throwIfPartnerEnrollmentTrialCapExceeded({
  workspaceId,
  programId,
  additionalApproved = 1,
}: {
  workspaceId: string;
  programId: string;
  additionalApproved?: number;
}) {
  const workspace = await prisma.project.findUnique({
    where: { id: workspaceId },
    select: { trialEndsAt: true },
  });

  if (!workspace?.trialEndsAt || workspace.trialEndsAt <= new Date()) {
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
