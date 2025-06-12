"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  createRewardSchema,
  REWARD_EVENT_COLUMN_MAPPING,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const createRewardAction = authActionClient
  .schema(createRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      event,
      amount,
      type,
      maxDuration,
      maxAmount,
      isDefault,
      partnerIds,
      partnerIdsExcluded,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (maxAmount && maxAmount < amount) {
      throw new Error(
        "Max reward amount cannot be less than the reward amount.",
      );
    }

    // Only one default reward is allowed for each event
    if (isDefault) {
      const defaultReward = await prisma.reward.findFirst({
        where: {
          programId,
          event,
          default: true,
        },
      });

      if (defaultReward) {
        throw new Error(
          `There is an existing default ${event} reward already. A program can only have one ${event} default reward.`,
        );
      }
    }

    const finalPartnerIds = isDefault ? partnerIdsExcluded : partnerIds;

    if (finalPartnerIds && finalPartnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: finalPartnerIds,
          },
        },
        select: {
          partnerId: true,
        },
      });

      const invalidPartnerIds = finalPartnerIds.filter(
        (id) =>
          !programEnrollments.some((enrollment) => enrollment.partnerId === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided: ${invalidPartnerIds.join(", ")}`,
        );
      }
    }

    const reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId,
        event,
        type,
        amount,
        maxDuration,
        maxAmount,
        default: isDefault,
      },
    });

    const rewardEventColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    // Update all partners for default rewards
    if (reward.default) {
      await prisma.programEnrollment.updateMany({
        where: {
          programId,

          // don't overwrite existing partner-specific rewards if exists
          [rewardEventColumn]: null,

          // exclude partners that are excluded from the default reward
          ...(partnerIdsExcluded && {
            partnerId: {
              notIn: partnerIdsExcluded,
            },
          }),
        },
        data: {
          [rewardEventColumn]: reward.id,
        },
      });
    }

    // For non-default rewards, update only the partners that are being added
    else if (partnerIds && partnerIds.length > 0) {
      await prisma.programEnrollment.updateMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        data: {
          [rewardEventColumn]: reward.id,
        },
      });
    }
  });
