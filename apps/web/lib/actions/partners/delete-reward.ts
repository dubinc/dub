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

    await prisma.reward.delete({
      where: {
        id: rewardId,
      },
    });

    const columnName = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    const defaultReward = await prisma.reward.findFirst({
      where: {
        programId,
        event: reward.event,
        default: true,
      },
    });

    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        [columnName]: rewardId,
      },
      data: {
        [columnName]: defaultReward ? defaultReward.id : null,
      },
    });
  });
