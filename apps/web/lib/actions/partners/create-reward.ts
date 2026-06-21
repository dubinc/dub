"use server";

import { trackRewardActivityLog } from "@/lib/api/activity-log/track-reward-activity-log";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { queueRewardProcessing } from "@/lib/api/rewards/queue-reward-processing";
import { validateReward } from "@/lib/api/rewards/validate-reward";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import {
  createRewardSchema,
  REWARD_EVENT_COLUMN_MAPPING,
} from "@/lib/zod/schemas/rewards";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const createRewardAction = authActionClient
  .inputSchema(createRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      event,
      type,
      amountInCents,
      amountInPercentage,
      maxDuration,
      description,
      tooltipDescription,
      modifiers,
      config,
      groupId,
      spendLimitAmount,
      spendLimitInterval,
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);
    const {
      canUseAdvancedRewardLogic,
      canSetRewardSpendLimit,
      canCreateReferralReward,
    } = getPlanCapabilities(workspace.plan);

    if (event === "referral" && !canCreateReferralReward) {
      throw new Error(
        "Referral rewards are only available on the Advanced plan and above.",
      );
    }

    if (modifiers && !canUseAdvancedRewardLogic) {
      throw new Error(
        "Advanced reward structures are only available on the Advanced plan and above.",
      );
    }

    if ((spendLimitAmount || spendLimitInterval) && !canSetRewardSpendLimit) {
      throw new Error(
        "Spend limits are only available on the Enterprise plan.",
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
          tooltipDescription: tooltipDescription || null,
          modifiers: modifiers || Prisma.DbNull,
          config: config ?? Prisma.DbNull,
          spendLimitAmount,
          spendLimitInterval,
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

      return reward;
    });

    await queueRewardProcessing({
      event: "reward-created",
      groupId,
      occurredAt: new Date().toISOString(),
      rewardSnapshot: {
        id: reward.id,
        event: reward.event,
        description: formatRewardDescription(serializeReward(reward), {
          includeEarnPrefix: false,
        }),
      },
    });

    waitUntil(
      Promise.allSettled([
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

        trackRewardActivityLog({
          workspaceId: workspace.id,
          programId,
          userId: user.id,
          resourceId: reward.id,
          parentResourceType: "group",
          parentResourceId: groupId,
          old: null,
          new: reward,
        }),
      ]),
    );
  });
