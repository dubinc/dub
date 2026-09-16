"use server";

import { trackRewardActivityLog } from "@/lib/api/activity-log/track-reward-activity-log";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { queueRewardProcessing } from "@/lib/api/rewards/queue-reward-processing";
import { prisma } from "@/lib/prisma";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  rewardActivityDescriptionSchema,
} from "@/lib/zod/schemas/rewards";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const deleteRewardSchema = z
  .object({
    workspaceId: z.string(),
    rewardId: z.string(),
  })
  .extend(rewardActivityDescriptionSchema.shape);

export const deleteRewardAction = authActionClient
  .inputSchema(deleteRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { rewardId, activityDescription } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];
    const linkRewardIdColumn =
      reward.event === "click" ||
      reward.event === "lead" ||
      reward.event === "sale"
        ? REWARD_EVENT_COLUMN_MAPPING[reward.event]
        : null;

    const linksToExpire = linkRewardIdColumn
      ? (
          await prisma.linkReward.findMany({
            where: {
              [linkRewardIdColumn]: reward.id,
            },
            select: {
              link: {
                select: {
                  domain: true,
                  key: true,
                },
              },
            },
          })
        ).map(({ link }) => link)
      : [];

    await prisma.$transaction(async (tx) => {
      await tx.partnerGroup.updateMany({
        where: {
          [rewardIdColumn]: reward.id,
        },
        data: {
          [rewardIdColumn]: null,
        },
      });

      if (linkRewardIdColumn) {
        await tx.linkReward.updateMany({
          where: {
            [linkRewardIdColumn]: reward.id,
          },
          data: {
            [linkRewardIdColumn]: null,
          },
        });
      }

      // soft delete reward, we will hard delete it in the cron job
      await tx.reward.update({
        where: {
          id: reward.id,
        },
        data: {
          programId: null,
        },
      });
    });

    if (reward.groupId) {
      await queueRewardProcessing({
        event: "reward-deleted",
        groupId: reward.groupId,
        occurredAt: new Date().toISOString(),
        rewardSnapshot: {
          id: reward.id,
          event: reward.event,
          description: formatRewardDescription(serializeReward(reward), {
            includeEarnPrefix: false,
          }),
          activityDescription,
        },
      });
    }

    waitUntil(
      Promise.allSettled([
        ...(linksToExpire.length > 0
          ? [linkCache.expireMany(linksToExpire)]
          : []),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "reward.deleted",
          description: `Reward ${rewardId} deleted`,
          actor: user,
          targets: [
            {
              type: "reward",
              id: rewardId,
              metadata: reward,
            },
          ],
        }),

        trackRewardActivityLog({
          workspaceId: workspace.id,
          programId,
          userId: user.id,
          resourceId: reward.id,
          parentResourceType: "group",
          parentResourceId: reward.groupId,
          old: reward,
          new: null,
          description: activityDescription,
        }),
      ]),
    );
  });
