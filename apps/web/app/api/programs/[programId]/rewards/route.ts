import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createRewardSchema, rewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/rewards - get all rewards for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const rewards = await prisma.reward.findMany({
    where: {
      programId,
    },
  });

  return NextResponse.json(z.array(rewardSchema).parse(rewards));
});

// POST /api/programs/[programId]/rewards - create a new reward
export const POST = withWorkspace(async ({ workspace, params, req }) => {
  const { programId } = params;

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const { partnerIds, isDefault, ...data } = createRewardSchema.parse(
    await parseRequestBody(req),
  );

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

  if (isDefault) {
    if (program.defaultRewardId) {
      throw new DubApiError({
        code: "bad_request",
        message: `A program can only have one default reward and you've already set one with id ${program.defaultRewardId}.`,
      });
    }

    if (data.event !== "sale") {
      throw new DubApiError({
        code: "bad_request",
        message: "Default reward must be of type `sale`.",
      });
    }

    if (partnerIds && partnerIds.length > 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "Default reward should not be partner specific.",
      });
    }
  }

  // TODO:
  // Partners can't be more than one reward of the same type.

  const reward = await prisma.reward.create({
    data: {
      ...data,
      id: createId({ prefix: "rew_" }),
      programId,
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

  if (isDefault) {
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
  // Send an email to the partners about the reward being created.

  return NextResponse.json(rewardSchema.parse(reward));
});
