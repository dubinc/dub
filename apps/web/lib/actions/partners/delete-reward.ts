"use server";

import { trackRewardActivityLog } from "@/lib/api/activity-log/track-reward-activity-log";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { queueRewardProcessing } from "@/lib/api/rewards/queue-reward-processing";
import { prisma } from "@/lib/prisma";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const deleteRewardSchema = z.object({
  workspaceId: z.string(),
  rewardId: z.string(),
});

export const deleteRewardAction = authActionClient
  .inputSchema(deleteRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { rewardId } = parsedInput;

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

    const { partnerGroup, deletedReward } = await prisma.$transaction(
      async (tx) => {
        const partnerGroup = await tx.partnerGroup.update({
          // @ts-ignore
          where: {
            [rewardIdColumn]: reward.id,
          },
          data: {
            [rewardIdColumn]: null,
          },
        });

        // soft delete reward, we will hard delete it in the cron job
        const deletedReward = await tx.reward.update({
          where: {
            id: reward.id,
          },
          data: {
            programId: null,
          },
        });

        return {
          partnerGroup,
          deletedReward,
        };
      },
    );

    await queueRewardProcessing({
      event: "reward-deleted",
      groupId: partnerGroup.id,
      occurredAt: new Date().toISOString(),
      rewardSnapshot: {
        id: deletedReward.id,
        event: deletedReward.event,
        description: formatRewardDescription(serializeReward(deletedReward), {
          includeEarnPrefix: false,
        }),
      },
    });

    waitUntil(
      Promise.allSettled([
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
          parentResourceId: partnerGroup.id,
          old: reward,
          new: null,
        }),
      ]),
    );
  });
