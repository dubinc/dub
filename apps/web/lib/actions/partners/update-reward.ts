"use server";

import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { updateRewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const updateRewardAction = authActionClient
  .schema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, rewardId, partnerIds, amount, maxDuration, type } =
      parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const reward = await prisma.reward.findUniqueOrThrow({
      where: {
        id: rewardId,
      },
      select: {
        programId: true,
        _count: {
          select: {
            partners: true,
          },
        },
      },
    });

    if (reward.programId !== programId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Reward is not associated with the program.",
      });
    }

    let programEnrollments: { id: string }[] = [];

    if (partnerIds && partnerIds.length > 0) {
      if (reward._count.partners === 0) {
        throw new DubApiError({
          code: "bad_request",
          message: "Cannot add partners to a program-wide reward.",
        });
      }

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

      if (programEnrollments.length !== partnerIds.length) {
        throw new DubApiError({
          code: "bad_request",
          message: "Invalid partner IDs provided.",
        });
      }
    } else {
      if (reward._count.partners > 0) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "At least one partner must be selected for a partner-specific reward.",
        });
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
        ...(programEnrollments && {
          partners: {
            deleteMany: {},
            createMany: {
              data: programEnrollments.map(({ id }) => ({
                programEnrollmentId: id,
              })),
            },
          },
        }),
      },
    });
  });
