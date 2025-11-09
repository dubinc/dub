"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { validateReward } from "@/lib/api/rewards/validate-reward";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import {
  createRewardSchema,
  REWARD_EVENT_COLUMN_MAPPING,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const createRewardAction = authActionClient
  .schema(createRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      event,
      type,
      amountInCents,
      amountInPercentage,
      maxDuration,
      description,
      modifiers,
      groupId,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const { canUseAdvancedRewardLogic } = getPlanCapabilities(workspace.plan);

    if (modifiers && !canUseAdvancedRewardLogic) {
      throw new Error(
        "Advanced reward structures are only available on the Advanced plan and above.",
      );
    }

    const group = await getGroupOrThrow({
      groupId,
      programId,
    });

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];

    if (group[rewardIdColumn]) {
      throw new Error(
        `You can't create a ${event} reward for this group because it already has a ${event} reward.`,
      );
    }

    validateReward(parsedInput);

    const reward = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.create({
        data: {
          id: createId({ prefix: "rw_" }),
          programId,
          event,
          type,
          maxDuration,
          description: description || null,
          modifiers: modifiers || Prisma.DbNull,
          ...(type === "flat"
            ? {
                amountInCents,
                amountInPercentage: null,
              }
            : {
                amountInCents: null,
                amountInPercentage: new Prisma.Decimal(amountInPercentage!),
              }),
        },
      });

      await tx.partnerGroup.update({
        where: {
          id: groupId,
        },
        data: {
          [rewardIdColumn]: reward.id,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          groupId,
        },
        data: {
          [rewardIdColumn]: reward.id,
        },
      });

      return reward;
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "reward.created",
        description: `Reward ${reward.id} created`,
        actor: user,
        targets: [
          {
            type: "reward",
            id: reward.id,
            metadata: serializeReward(reward),
          },
        ],
      }),
    );
  });
