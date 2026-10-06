import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { movePartnersToGroup } from "@/lib/api/groups/move-partners-to-group";
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

export async function approveProgramApplication({
  programId,
  partnerId,
  applicationId,
  groupId,
  userId,
}: ApproveProgramApplicationInput) {
  const [programApplication, existingEnrollment] = await Promise.all([
    prisma.programApplication.findFirst({
      where: {
        ...(applicationId && { id: applicationId }),
        programId,
        partnerId,
        status: {
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
    }),

    prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        status: true,
      },
    }),
  ]);

  if (!programApplication) {
    throw new DubApiError({
      code: "not_found",
      message: "No pending or rejected application found.",
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

  const now = new Date();

  const isNewEnrollment =
    existingEnrollment?.status !== ProgramEnrollmentStatus.approved;

  await prisma.$transaction(async (tx) => {
    if (isNewEnrollment) {
      throwIfPartnersLimitExceeded(program.workspace);
    }

    const programEnrollment: Partial<ProgramEnrollment> = {
      ...(programApplication && { applicationId: programApplication.id }),
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

    await tx.programEnrollment.upsert({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      create: {
        id: createId({ prefix: "pge_" }),
        partnerId,
        programId,
        ...programEnrollment,
      },
      update: {
        ...programEnrollment,
      },
    });

    if (programApplication) {
      await tx.programApplication.update({
        where: {
          id: programApplication.id,
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
