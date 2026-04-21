import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { trackActivityLog } from "../api/activity-log/track-activity-log";
import { DubApiError } from "../api/errors";
import { getGroupOrThrow } from "../api/groups/get-group-or-throw";
import { triggerWorkflows } from "../cron/qstash-workflow";
import { approvePartnerSchema } from "../zod/schemas/partners";

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

  if (programEnrollment.status !== "pending") {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This enrollment cannot be approved because it is no longer pending.",
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
  });

  waitUntil(
    Promise.allSettled([
      trackActivityLog({
        workspaceId: program.workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId,
        action: "partner.approved",
        changeSet: {
          status: {
            old: "pending",
            new: programEnrollment.status,
          },
        },
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
