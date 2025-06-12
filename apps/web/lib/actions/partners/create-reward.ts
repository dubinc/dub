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
    let {
      event,
      amount,
      type,
      maxDuration,
      maxAmount,
      isDefault,
      partnerIds,
      excludedPartnerIds,
    } = parsedInput;

    partnerIds = partnerIds || [];
    excludedPartnerIds = excludedPartnerIds || [];

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

    const finalPartnerIds = [...partnerIds, ...excludedPartnerIds];

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

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        ...(reward.default
          ? {
              [rewardIdColumn]: null,
              ...(excludedPartnerIds.length > 0 && {
                partnerId: {
                  notIn: excludedPartnerIds,
                },
              }),
            }
          : {
              partnerId: {
                in: partnerIds,
              },
            }),
      },
      data: {
        [rewardIdColumn]: reward.id,
      },
    });
  });
