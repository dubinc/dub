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

    if (partnerIds && partnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        select: {
          partnerId: true,
        },
      });

      const invalidPartnerIds = partnerIds.filter(
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
        [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.id,
      },
    });
  });
