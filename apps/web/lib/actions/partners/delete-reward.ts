"use server";

import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const deleteRewardSchema = z.object({
  workspaceId: z.string(),
  rewardId: z.string(),
});

export const deleteRewardAction = authActionClient
  .schema(deleteRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { rewardId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    if (reward.default) {
      throw new Error(`Default ${reward.event} reward cannot be deleted.`);
    }

    const defaultReward = await prisma.reward.findFirst({
      where: {
        programId,
        event: reward.event,
        default: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      const columnName = REWARD_EVENT_COLUMN_MAPPING[reward.event];

      // 1. Update current associations
      // - If the reward is the default, update the default reward
      // - If the reward is not the default, update the reward to null
      await tx.programEnrollment.updateMany({
        where: {
          programId,
          [columnName]: reward.id,
        },
        data: {
          [columnName]: defaultReward ? defaultReward.id : null,
        },
      });

      // 2. Finally, delete the reward
      await tx.reward.delete({
        where: {
          id: reward.id,
        },
      });
    });
  });
