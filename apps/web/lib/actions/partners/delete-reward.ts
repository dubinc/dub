"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const deleteRewardSchema = z.object({
  workspaceId: z.string(),
  rewardId: z.string(),
});

export const deleteRewardAction = authActionClient
  .schema(deleteRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { rewardId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    if (reward.default) {
      throw new Error(`Default ${reward.event} reward cannot be deleted.`);
    }

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    await prisma.$transaction(async (tx) => {
      // 1. Find the default reward for the same event (if it exists)
      const defaultReward = await tx.reward.findFirst({
        where: {
          programId,
          event: reward.event,
          default: true,
        },
      });

      // 2. Update current associations
      await tx.programEnrollment.updateMany({
        where: {
          programId,
          [rewardIdColumn]: reward.id,
        },
        data: {
          // Replace the current reward with the default reward for the same event if it exists
          [rewardIdColumn]: defaultReward ? defaultReward.id : null,
        },
      });

      // 3. Finally, delete the current reward
      await tx.reward.delete({
        where: {
          id: reward.id,
        },
      });
    });

    waitUntil(
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
    );
  });
