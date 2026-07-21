"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { unbanPartnerJob } from "@/lib/jobs/handlers/unban-partner-job";
import { prisma } from "@/lib/prisma";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const unbanPartnerSchema = banPartnerSchema.omit({
  reason: true,
});

// Unban a partner
export const unbanPartnerAction = authActionClient
  .inputSchema(unbanPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const where = {
      programId,
      partnerId,
    };

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: where,
      },
      include: {
        program: true,
        partner: true,
      },
    });

    if (programEnrollment.status !== "banned") {
      throw new Error("This partner is not banned.");
    }

    const partnerGroup = await getGroupOrThrow({
      programId,
      groupId:
        programEnrollment.groupId || programEnrollment.program.defaultGroupId,
    });

    await prisma.$transaction([
      prisma.link.updateMany({
        where,
        data: {
          disabledAt: null,
          expiresAt: null,
        },
      }),

      prisma.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: {
          status: "approved",
          bannedAt: null,
          bannedReason: null,
          clickRewardId: partnerGroup.clickRewardId,
          leadRewardId: partnerGroup.leadRewardId,
          saleRewardId: partnerGroup.saleRewardId,
          discountId: partnerGroup.discountId,
        },
      }),
    ]);

    await unbanPartnerJob.dispatch({
      workspaceId: workspace.id,
      programId,
      partnerId,
    });

    waitUntil(
      trackActivityLog({
        workspaceId: workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId: user.id,
        action: "partner.unbanned",
        changeSet: {
          status: {
            old: "banned",
            new: "approved",
          },
        },
      }),
    );
  });
