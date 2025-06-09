"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  createRewardSchema,
  REWARD_TYPE_TO_TABLE_COLUMN,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const createRewardAction = authActionClient
  .schema(createRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      partnerIds,
      event,
      amount,
      type,
      maxDuration,
      maxAmount,
      isDefault,
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
          event,
          programId,
          default: true,
        },
      });

      if (defaultReward) {
        throw new Error(
          `There is an existing default ${event} reward already. A program can only have one ${event} default reward.`,
        );
      }
    }

    let programEnrollments: { id: string }[] = [];

    if (partnerIds && partnerIds.length > 0) {
      programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        select: {
          id: true,
        },
      });

      const invalidPartnerIds = partnerIds.filter(
        (id) => !programEnrollments.some((enrollment) => enrollment.id === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided: ${invalidPartnerIds.join(", ")}`,
        );
      }

      // only one partner-specific reward is allowed for each event for a partner
      const existingRewardCount = await prisma.partnerReward.count({
        where: {
          reward: {
            event,
            programId,
          },
          programEnrollment: {
            partnerId: {
              in: partnerIds,
            },
          },
        },
      });

      if (existingRewardCount > 0) {
        throw new Error(
          `Some of these partners already have an existing partner-specific ${event} reward. Remove those partners to continue.`,
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

    const columnName = REWARD_TYPE_TO_TABLE_COLUMN[reward.event];

    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        ...(!reward.default &&
          partnerIds && {
            partnerId: {
              in: partnerIds,
            },
          }),
      },
      data: {
        [columnName]: reward.id,
      },
    });
  });
