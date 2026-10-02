import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { throwIfPartnersLimitExceeded } from "@/lib/partners/throw-if-partners-limit-exceeded";
import { prisma } from "@/lib/prisma";
import { approveProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

type ApproveProgramApplicationInput = z.infer<
  typeof approveProgramApplicationSchema
> & {
  programId: string;
  userId: string;
};

export async function approveProgramApplication({
  programId,
  partnerId,
  groupId,
  userId,
}: ApproveProgramApplicationInput) {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      groupId: true,
      status: true,
      program: {
        select: {
          defaultGroupId: true,
          workspace: {
            select: {
              id: true,
              trialEndsAt: true,
              partnersUsage: true,
              partnersLimit: true,
            },
          },
        },
      },
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "Program enrollment not found.",
    });
  }

  if (!["pending", "rejected"].includes(programEnrollment.status)) {
    throw new DubApiError({
      code: "bad_request",
      message: `This enrollment cannot be approved because it is already ${programEnrollment.status}.`,
    });
  }

  const { program } = programEnrollment;

  const finalGroupId =
    groupId || programEnrollment.groupId || program.defaultGroupId;

  if (!finalGroupId) {
    throw new DubApiError({
      code: "not_found",
      message:
        "No group ID provided and no default group ID found in the program.",
    });
  }

  const group = await getGroupOrThrow({
    programId,
    groupId: finalGroupId,
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    throwIfPartnersLimitExceeded(program.workspace);

    const programEnrollment = await tx.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      data: {
        status: "approved",
        createdAt: now,
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        referralRewardId: group.referralRewardId,
        customRewardId: group.customRewardId,
        discountId: group.discountId,
      },
    });

    if (programEnrollment.applicationId) {
      await tx.programApplication.update({
        where: {
          id: programEnrollment.applicationId,
        },
        data: {
          status: ProgramApplicationStatus.approved,
          reviewedAt: now,
          rejectionReason: null,
          rejectionNote: null,
          userId,
        },
      });
    }

    await tx.project.update({
      where: {
        id: program.workspace.id,
      },
      data: {
        partnersUsage: {
          increment: 1,
        },
      },
    });
  });

  waitUntil(
    Promise.allSettled([
      // Queue an index update because the enrollment status moved to approved.
      queuePartnerSearchSync({ partnerIds: [partnerId], programId }),

      trackActivityLog({
        workspaceId: program.workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId,
        action: "partner_application.approved",
        changeSet: {
          status: {
            old: programEnrollment.status,
            new: ProgramEnrollmentStatus.approved,
          },
        },
      }),

      trackApplicationEvents({
        event: "approved",
        programId,
        partnerIds: [partnerId],
      }),

      dispatchWorkflows({
        name: "partner-approved-workflow",
        payload: {
          programId,
          partnerId,
          userId,
        },
        options: {
          label: partnerId,
        },
      }),
    ]),
  );
}
