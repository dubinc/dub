"use server";

import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  updateRewardSchema,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
import { authActionClient } from "../safe-action";

export const updateRewardAction = authActionClient
  .schema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    let {
      rewardId,
      amount,
      maxDuration,
      type,
      maxAmount,
      partnerIds,
      partnerIdsExcluded,
    } = parsedInput;

    partnerIds = partnerIds || [];
    partnerIdsExcluded = partnerIdsExcluded || [];

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

    const finalPartnerIds = [...partnerIds, ...partnerIdsExcluded];

    if (finalPartnerIds && finalPartnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: finalPartnerIds,
          },
        },
      });

      const invalidPartnerIds = finalPartnerIds.filter(
        (id) => !programEnrollments.some(({ partnerId }) => partnerId === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided: ${invalidPartnerIds.join(", ")}`,
        );
      }
    }

    const updatedReward = await prisma.reward.update({
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

    if (updatedReward.default) {
      await updateDefaultReward({
        reward: updatedReward,
        partnerIdsExcluded,
      });
    }

    // const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    // // Get current partner associations for this reward
    // const currentAssociations = await prisma.programEnrollment.findMany({
    //   where: {
    //     programId,
    //     [rewardIdColumn]: reward.id,
    //   },
    //   select: {
    //     partnerId: true,
    //   },
    // });

    // const currentPartnerIds = currentAssociations.map((a) => a.partnerId);
    // const newPartnerIds = partnerIds || [];

    // // Determine which partners to add and remove
    // const partnersToAdd = newPartnerIds.filter(
    //   (id) => !currentPartnerIds.includes(id),
    // );

    // const partnersToRemove = currentPartnerIds.filter(
    //   (id) => !newPartnerIds.includes(id),
    // );

    // await prisma.$transaction(async (tx) => {
    //   // 1. Update reward details

    //   // 2. Remove partners that are no longer associated
    //   if (partnersToRemove.length > 0) {
    //     // TODO:
    //     // Should we instead update it with default reward id?

    //     await tx.programEnrollment.updateMany({
    //       where: {
    //         programId,
    //         partnerId: {
    //           in: partnersToRemove,
    //         },
    //       },
    //       data: {
    //         [rewardIdColumn]: null,
    //       },
    //     });
    //   }

    //   // 3. Add new partner associations
    //   if (partnersToAdd.length > 0) {
    //     await tx.programEnrollment.updateMany({
    //       where: {
    //         programId,
    //         partnerId: {
    //           in: partnersToAdd,
    //         },
    //       },
    //       data: {
    //         [rewardIdColumn]: reward.id,
    //       },
    //     });
    //   }
    // });
  });

// Update default reward
const updateDefaultReward = async ({
  reward,
  partnerIdsExcluded,
}: {
  reward: Reward;
  partnerIdsExcluded: string[];
}) => {
  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

  const existingExcludedPartners = await prisma.programEnrollment.findMany({
    where: {
      programId: reward.programId,
      [rewardIdColumn]: null,
    },
    select: {
      partnerId: true,
    },
  });

  const existingExcludedIds = existingExcludedPartners.map(
    ({ partnerId }) => partnerId,
  );

  const newlyExcludedIds = partnerIdsExcluded.filter(
    (id) => !existingExcludedIds.includes(id),
  );

  const newlyIncludedIds = existingExcludedIds.filter(
    (id) => !partnerIdsExcluded.includes(id),
  );

  // Exclude partners from the default reward
  if (newlyExcludedIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
        partnerId: {
          in: newlyExcludedIds,
        },
      },
      data: {
        [rewardIdColumn]: null,
      },
    });
  }

  // Include partners in the default reward
  if (newlyIncludedIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
        partnerId: {
          in: newlyIncludedIds,
        },
      },
      data: {
        [rewardIdColumn]: reward.id,
      },
    });
  }
};
