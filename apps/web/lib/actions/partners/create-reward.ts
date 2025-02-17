"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createId } from "@/lib/api/utils";
import { createRewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = createRewardSchema.and(
  z.object({
    workspaceId: z.string(),
    programId: z.string(),
  }),
);

export const createRewardAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerIds, event, amount, type, maxDuration } =
      parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
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
        throw new Error("Invalid partner IDs provided.");
      }
    }

    const hasDefaultReward = !!program.defaultRewardId;

    // if (event === "sale") {

    // }

    // TODO:
    // Partners can't be more than one reward of the same type.

    const reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rew_" }),
        programId,
        event,
        type,
        amount,
        maxDuration: maxDuration ? parseInt(maxDuration) : null,
        ...(programEnrollments && {
          partners: {
            createMany: {
              data: programEnrollments.map(({ id }) => ({
                programEnrollmentId: id,
              })),
            },
          },
        }),
      },
    });

    if (!hasDefaultReward) {
      await prisma.program.update({
        where: {
          id: programId,
        },
        data: {
          defaultRewardId: reward.id,
        },
      });
    }

    // TODO:
    // Send an email to partners who are eligible for the reward.

    console.log("New reward created", reward);
  });
