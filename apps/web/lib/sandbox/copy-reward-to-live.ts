"use server";

import { prisma } from "@/lib/prisma";
import {
  assertProductionWorkspace,
  assertStagingWorkspace,
} from "@/lib/sandbox/workspace-guards";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import { trackRewardActivityLog } from "../api/activity-log/track-reward-activity-log";
import { createId } from "../api/create-id";
import { getRewardOrThrow } from "../api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "../api/programs/get-default-program-id-or-throw";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { copyRewardToLiveSchema } from "./schemas";

export const copyRewardToLiveAction = authActionClient
  .inputSchema(copyRewardToLiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { rewardId, targetGroupId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    assertStagingWorkspace(workspace, {
      message: "Reward can only be copied from a staging workspace.",
    });

    const { program: targetProgram, ...targetGroup } =
      await prisma.partnerGroup.findUniqueOrThrow({
        where: {
          id: targetGroupId,
        },
        include: {
          program: {
            select: {
              id: true,
              workspace: {
                select: {
                  id: true,
                  environment: true,
                  stagingWorkspaceId: true,
                  users: {
                    where: {
                      userId: user.id,
                    },
                    select: {
                      userId: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    const { workspace: targetWorkspace } = targetProgram;

    if (targetWorkspace.stagingWorkspaceId !== workspace.id) {
      throw new Error(
        "Target program is not linked to this staging workspace.",
      );
    }

    // Check user has access in the target program
    if (targetWorkspace.users.length === 0) {
      throw new Error("You are not allowed to copy a reward to this program.");
    }

    throwIfNoPermission({
      role: targetWorkspace.users[0].role,
      requiredRoles: ["owner", "member"],
    });

    assertProductionWorkspace(targetWorkspace, {
      message: "Reward can only be copied to a live program.",
    });

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    const newReward = await prisma.$transaction(async (tx) => {
      const newReward = await tx.reward.create({
        data: {
          id: createId({ prefix: "rw_" }),
          programId: targetGroup.programId,
          description: reward.description,
          tooltipDescription: reward.tooltipDescription,
          event: reward.event,
          type: reward.type,
          amountInCents: reward.amountInCents,
          amountInPercentage: reward.amountInPercentage,
          maxDuration: reward.maxDuration,
          modifiers: reward.modifiers ?? undefined,
          config: reward.config ?? undefined,
        },
      });

      const { count } = await tx.partnerGroup.updateMany({
        where: {
          id: targetGroupId,
          [rewardIdColumn]: null,
        },
        data: {
          [rewardIdColumn]: newReward.id,
        },
      });

      // This will revert the transaction if the target group already has a reward
      if (count === 0) {
        throw new Error(
          `The target group already has a ${reward.event} reward.`,
        );
      }

      await tx.programEnrollment.updateMany({
        where: {
          groupId: targetGroupId,
        },
        data: {
          [rewardIdColumn]: newReward.id,
        },
      });

      return newReward;
    });

    waitUntil(
      trackRewardActivityLog({
        workspaceId: targetWorkspace.id,
        programId: targetProgram.id,
        userId: user.id,
        resourceId: newReward.id,
        parentResourceType: "group",
        parentResourceId: targetGroupId,
        old: null,
        new: newReward,
      }),
    );
  });
