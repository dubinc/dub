import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { triggerWorkflows } from "../../../cron/qstash-workflow";
import { throwIfPartnersLimitExceeded } from "../../../partners/throw-if-partners-limit-exceeded";
import { approvePartnerSchema } from "../../../zod/schemas/partners";
import { trackActivityLog } from "../../activity-log/track-activity-log";
import { DubApiError } from "../../errors";
import { getGroupOrThrow } from "../../groups/get-group-or-throw";

type ApprovePartnerInput = z.infer<typeof approvePartnerSchema> & {
  programId: string;
  userId: string;
};

export async function approvePartner({
  programId,
  partnerId,
  groupId,
  userId,
}: ApprovePartnerInput) {
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
        createdAt: new Date(),
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        referralRewardId: group.referralRewardId,
        discountId: group.discountId,
      },
    });

    if (programEnrollment.applicationId) {
      await tx.programApplication.update({
        where: {
          id: programEnrollment.applicationId,
        },
        data: {
          reviewedAt: new Date(),
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
      trackActivityLog({
        workspaceId: program.workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId,
        action: "partner_application.approved",
        changeSet: {
          status: {
            old: ProgramEnrollmentStatus.pending,
            new: ProgramEnrollmentStatus.approved,
          },
        },
      }),

      trackApplicationEvents({
        event: "approved",
        programId,
        partnerIds: [partnerId],
      }),

      triggerWorkflows({
        workflowId: "partner-approved",
        body: {
          programId,
          partnerId,
          userId,
        },
      }),
    ]),
  );
}
