"use server";

import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { updateRewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = updateRewardSchema.and(
  z.object({
    workspaceId: z.string(),
    programId: z.string(),
    rewardId: z.string(),
  }),
);

export const updateRewardAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, rewardId, partnerIds, ...data } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await prisma.reward.findUniqueOrThrow({
      where: {
        id: rewardId,
        programId,
      },
    });

    let programEnrollments: { id: string }[] = [];

    if (partnerIds) {
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
    }

    const reward = await prisma.reward.update({
      where: {
        id: rewardId,
      },
      data: {
        ...data,
        maxDuration: data.maxDuration ? parseInt(data.maxDuration) : null,
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
