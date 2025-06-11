"use server";

import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  updateRewardSchema,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const updateRewardAction = authActionClient
  .schema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { rewardId, partnerIds, amount, maxDuration, type, maxAmount } =
      parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (maxAmount && maxAmount < amount) {
      throw new Error(
        "Max reward amount cannot be less than the reward amount.",
      );
    }

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    if (partnerIds && partnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
      });

      const invalidPartnerIds = partnerIds.filter(
        (id) => !programEnrollments.some(({ partnerId }) => partnerId === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided: ${invalidPartnerIds.join(", ")}`,
        );
      }
    }

    const rewardColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    // Get current partner associations for this reward
    const currentAssociations = await prisma.programEnrollment.findMany({
      where: {
        programId,
        [rewardColumn]: reward.id,
      },
      select: {
        partnerId: true,
      },
    });

    const currentPartnerIds = currentAssociations.map((a) => a.partnerId);
    const newPartnerIds = partnerIds || [];

    // Determine which partners to add and remove
    const partnersToAdd = newPartnerIds.filter(
      (id) => !currentPartnerIds.includes(id),
    );

    const partnersToRemove = currentPartnerIds.filter(
      (id) => !newPartnerIds.includes(id),
    );

    await prisma.$transaction(async (tx) => {
      // 1. Update reward details
      await tx.reward.update({
        where: {
          id: rewardId,
        },
        data: {
          type,
          amount,
          maxDuration,
          maxAmount,
        },
      });

      // 2. Remove partners that are no longer associated
      if (partnersToRemove.length > 0) {
        const defaultReward = await tx.reward.findFirst({
          where: {
            programId,
            event: reward.event,
            default: true,
          },
        });

        await tx.programEnrollment.updateMany({
          where: {
            programId,
            partnerId: {
              in: partnersToRemove,
            },
          },
          data: {
            [rewardColumn]: defaultReward ? defaultReward.id : null,
          },
        });
      }

      // 3. Add new partner associations
      if (partnersToAdd.length > 0) {
        await tx.programEnrollment.updateMany({
          where: {
            programId,
            partnerId: {
              in: partnersToAdd,
            },
          },
          data: {
            [rewardColumn]: reward.id,
          },
        });
      }
    });
  });
