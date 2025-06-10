"use server";

import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  updateRewardSchema,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
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

    await prisma.reward.update({
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

    if (!reward.default) {
      waitUntil(
        prisma.programEnrollment.updateMany({
          where: {
            programId,
            ...(partnerIds && {
              partnerId: {
                in: partnerIds,
              },
            }),
          },
          data: {
            [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.id,
          },
        }),
      );
    }
  });
