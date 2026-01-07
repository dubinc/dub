"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";

const deleteRewardSchema = z.object({
  workspaceId: z.string(),
  rewardId: z.string(),
});

export const deleteRewardAction = authActionClient
  .inputSchema(deleteRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { rewardId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    await prisma.$transaction(async (tx) => {
      await tx.partnerGroup.update({
        // @ts-ignore
        where: {
          [rewardIdColumn]: reward.id,
        },
        data: {
          [rewardIdColumn]: null,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          [rewardIdColumn]: reward.id,
        },
        data: {
          [rewardIdColumn]: null,
        },
      });

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
