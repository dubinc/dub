import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { movePartnersToGroup } from "@/lib/api/groups/move-partners-to-group";
import { throwIfInvalidPartnerTags } from "@/lib/api/partner-tags/throw-if-invalid-partner-tags";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { throwIfPartnersLimitExceeded } from "@/lib/partners/throw-if-partners-limit-exceeded";
import { prisma } from "@/lib/prisma";
import { approveProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import {
  ProgramApplicationStatus,
  ProgramEnrollment,
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

const APPROVABLE_APPLICATION_STATUSES: ProgramApplicationStatus[] = [
  ProgramApplicationStatus.pending,
  ProgramApplicationStatus.rejected,
];

// `approved` covers partners applying to join another group
const APPROVABLE_ENROLLMENT_STATUSES: ProgramEnrollmentStatus[] = [
  ProgramEnrollmentStatus.pending,
  ProgramEnrollmentStatus.rejected,
  ProgramEnrollmentStatus.approved,
];

export async function approveProgramApplication({
  programId,
  partnerId,
  applicationId,
  groupId,
  tagIds,
  tagNames,
  userId,
}: ApproveProgramApplicationInput) {
  const existingEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      status: true,
    },
  });

  if (
    existingEnrollment &&
    !APPROVABLE_ENROLLMENT_STATUSES.includes(existingEnrollment.status)
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `This application cannot be approved because the partner is ${existingEnrollment.status}.`,
    });
  }

  const isEnrollmentApproved =
    existingEnrollment?.status === ProgramEnrollmentStatus.approved;
  const requirePendingApplication = !applicationId && isEnrollmentApproved;

  const programApplication = await prisma.programApplication.findFirst({
    where: {
      ...(applicationId && { id: applicationId }),
      programId,
      partnerId,
      status: requirePendingApplication
        ? ProgramApplicationStatus.pending
        : {
            in: APPROVABLE_APPLICATION_STATUSES,
          },
    },
    select: {
      id: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!programApplication) {
    // No application ID was provided and the partner has no pending application
    if (requirePendingApplication) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This application cannot be approved because it is already approved.",
      });
    }

    throw new DubApiError({
      code: "not_found",
      message: "No pending application or rejected application found.",
    });
  }

  const { program } = programApplication;

  const finalGroupId =
    groupId ?? programApplication.groupId ?? program.defaultGroupId;

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

  const partnerTags = await throwIfInvalidPartnerTags({
    programId,
    partnerTagIds: tagIds,
    partnerTagNames: tagNames,
  });

  const now = new Date();
  const isNewEnrollment = !isEnrollmentApproved;

  await prisma.$transaction(async (tx) => {
    if (isNewEnrollment) {
      throwIfPartnersLimitExceeded(program.workspace);
    }

    const programEnrollment: Partial<ProgramEnrollment> = {
      applicationId: programApplication.id,
      ...(isNewEnrollment && {
        status: ProgramEnrollmentStatus.approved,
        createdAt: now,
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        referralRewardId: group.referralRewardId,
        customRewardId: group.customRewardId,
        discountId: group.discountId,
      }),
    };

    if (existingEnrollment) {
      // Only update the enrollment if its status did not change since it was
      // read (e.g. the partner was banned in the meantime)
      const { count } = await tx.programEnrollment.updateMany({
        where: {
          partnerId,
          programId,
          status: existingEnrollment.status,
        },
        data: programEnrollment,
      });

      if (count === 0) {
        throw new DubApiError({
          code: "conflict",
          message: "This partner changed status. Refresh and try again.",
        });
      }
    } else {
      await tx.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId,
          programId,
          ...programEnrollment,
        },
      });
    }

    const { count } = await tx.programApplication.updateMany({
      where: {
        id: programApplication.id,
        status: {
          in: APPROVABLE_APPLICATION_STATUSES,
        },
      },
      data: {
        status: ProgramApplicationStatus.approved,
        reviewedAt: now,
        rejectionReason: null,
        rejectionNote: null,
        userId,
      },
    });

    if (count === 0) {
      throw new DubApiError({
        code: "conflict",
        message:
          "This application was already reviewed. Refresh and try again.",
      });
    }

    if (partnerTags.length > 0) {
      await tx.programPartnerTag.createMany({
        skipDuplicates: true,
        data: partnerTags.map(({ id: partnerTagId }) => ({
          programId,
          partnerId,
          partnerTagId,
        })),
      });
    }

    if (isNewEnrollment) {
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
    }
  });

  // Approved partners are applying to join another group, so their enrollment
  // is moved instead of re-approved
  if (!isNewEnrollment) {
    await movePartnersToGroup({
      workspaceId: program.workspace.id,
      programId,
      partnerIds: [partnerId],
      userId,
      group,
    });
  }

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
            old: programApplication.status,
            new: ProgramApplicationStatus.approved,
          },
        },
      }),

      // Partners moved to another group were already approved
      isNewEnrollment &&
        trackApplicationEvents({
          event: "approved",
          programId,
          partnerIds: [partnerId],
        }),

      isNewEnrollment &&
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
