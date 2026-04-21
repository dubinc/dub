import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { trackActivityLog } from "../api/activity-log/track-activity-log";
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
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      rewards: true,
      discounts: true,
      workspace: true,
    },
  });

  if (!groupId && !program.defaultGroupId) {
    throw new Error("No group ID provided and no default group ID found.");
  }

  const group = await getGroupOrThrow({
    programId,
    groupId: groupId || program.defaultGroupId,
  });

  const programEnrollment = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.programEnrollment.update({
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
      include: {
        partner: true,
      },
    });

    if (enrollment.applicationId) {
      await tx.programApplication.update({
        where: {
          id: enrollment.applicationId,
        },
        data: {
          reviewedAt: new Date(),
          rejectionReason: null,
          rejectionNote: null,
          userId,
        },
      });
    }

    return enrollment;
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

  return programEnrollment;
}
