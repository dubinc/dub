import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "../api/groups/get-group-or-throw";
import { triggerWorkflows } from "../cron/qstash-workflow";
import { WorkspaceProps } from "../types";

export async function approvePartnerEnrollment({
  programId,
  partnerId,
  userId,
  groupId,
}: {
  programId: string;
  partnerId: string;
  userId: string;
  groupId?: string | null;
}) {
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

  const programEnrollment = await prisma.programEnrollment.update({
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

  waitUntil(
    (async () => {
      const { partner } = programEnrollment;
      const workspace = program.workspace as WorkspaceProps;

      const user = await prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      await Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "partner_application.approved",
          description: `Partner application approved for ${partner.id}`,
          actor: user,
          targets: [
            {
              type: "partner",
              id: partner.id,
              metadata: partner,
            },
          ],
        }),

        triggerWorkflows({
          workflowId: "partner-approved",
          body: {
            programId,
            partnerId,
            userId,
          },
        }),
      ]);
    })(),
  );
}
