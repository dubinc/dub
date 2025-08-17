"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { updateRewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateRewardAction = authActionClient
  .schema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { rewardId, amount, maxDuration, type, modifiers } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await getRewardOrThrow({
      rewardId,
      programId,
    });

    const { canUseAdvancedRewardLogic } = getPlanCapabilities(workspace.plan);

    if (modifiers && !canUseAdvancedRewardLogic) {
      throw new Error(
        "Advanced reward structures are only available on the Advanced plan and above.",
      );
    }

    const updatedReward = await prisma.reward.update({
      where: {
        id: rewardId,
      },
      data: {
        type,
        amount,
        maxDuration,
        modifiers: modifiers === null ? Prisma.JsonNull : modifiers,
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "reward.updated",
        description: `Reward ${rewardId} updated`,
        actor: user,
        targets: [
          {
            type: "reward",
            id: rewardId,
            metadata: updatedReward,
          },
        ],
      }),
    );
  });
