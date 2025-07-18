"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  updateRewardSchema,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateRewardAction = authActionClient
  .schema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let {
      rewardId,
      amount,
      maxDuration,
      type,
      includedPartnerIds,
      excludedPartnerIds,
    } = parsedInput;

    includedPartnerIds = includedPartnerIds || [];
    excludedPartnerIds = excludedPartnerIds || [];

    const programId = getDefaultProgramIdOrThrow(workspace);

    await getRewardOrThrow({
      rewardId,
      programId,
    });

    const finalPartnerIds = [...includedPartnerIds, ...excludedPartnerIds];

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
          `Invalid partner IDs provided (partners must be enrolled in the program): ${invalidPartnerIds.join(", ")}`,
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
      },
    });

    // Update partners associated with the reward
    if (updatedReward.default) {
      await updateDefaultRewardPartners({
        reward: updatedReward,
        partnerIds: excludedPartnerIds,
      });
    } else {
      await updateNonDefaultRewardPartners({
        reward: updatedReward,
        partnerIds: includedPartnerIds,
      });
    }

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

// Update default reward
const updateDefaultRewardPartners = async ({
  reward,
  partnerIds,
}: {
  reward: Reward;
  partnerIds: string[]; // Excluded partners
}) => {
  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

  const existingPartners = await prisma.programEnrollment.findMany({
    where: {
      programId: reward.programId,
      [rewardIdColumn]: null,
    },
    select: {
      partnerId: true,
    },
  });

  const existingPartnerIds = existingPartners.map(({ partnerId }) => partnerId);

  const excludedPartnerIds = partnerIds.filter(
    (id) => !existingPartnerIds.includes(id),
  );

  const includedPartnerIds = existingPartnerIds.filter(
    (id) => !partnerIds.includes(id),
  );

  // Exclude partners from the default reward
  if (excludedPartnerIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
        partnerId: {
          in: excludedPartnerIds,
        },
      },
      data: {
        [rewardIdColumn]: null,
      },
    });
  }

  // Include partners in the default reward
  if (includedPartnerIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
        [rewardIdColumn]: null,
        partnerId: {
          in: includedPartnerIds,
        },
      },
      data: {
        [rewardIdColumn]: reward.id,
      },
    });
  }
};

// Update non-default rewards
const updateNonDefaultRewardPartners = async ({
  reward,
  partnerIds,
}: {
  reward: Reward;
  partnerIds: string[]; // Included partners
}) => {
  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

  const existingPartners = await prisma.programEnrollment.findMany({
    where: {
      programId: reward.programId,
      [rewardIdColumn]: reward.id,
    },
    select: {
      partnerId: true,
    },
  });

  const existingPartnerIds = existingPartners.map(({ partnerId }) => partnerId);

  const includedPartnerIds = partnerIds.filter(
    (id) => !existingPartnerIds.includes(id),
  );

  const excludedPartnerIds = existingPartnerIds.filter(
    (id) => !partnerIds.includes(id),
  );

  // Include partners in the reward
  if (includedPartnerIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
        partnerId: {
          in: includedPartnerIds,
        },
      },
      data: {
        [rewardIdColumn]: reward.id,
      },
    });
  }

  // Exclude partners from the reward
  if (excludedPartnerIds.length > 0) {
    const defaultReward = await prisma.reward.findFirst({
      where: {
        programId: reward.programId,
        event: reward.event,
        default: true,
      },
    });

    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
        [rewardIdColumn]: reward.id,
        partnerId: {
          in: excludedPartnerIds,
        },
      },
      data: {
        // Replace the reward with the default reward if it exists
        [rewardIdColumn]: defaultReward ? defaultReward.id : null,
      },
    });
  }
};
