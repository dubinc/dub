import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createRewardSchema, RewardSchema } from "@/lib/zod/schemas/rewards";
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
    include: {
      programEnrollments: true,
    },
  });

  return NextResponse.json(z.array(RewardSchema).parse(rewards));
});

// POST /api/programs/[programId]/rewards - create a new reward
export const POST = withWorkspace(async ({ workspace, params, req }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const { partnerIds, ...data } = createRewardSchema.parse(
    await parseRequestBody(req),
  );

  if (partnerIds) {
    const partners = await prisma.programEnrollment.findMany({
      where: {
        programId,
        id: {
          in: partnerIds,
        },
      },
    });

    if (partners.length !== partnerIds.length) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid partner IDs provided.",
      });
    }
  }

  const reward = await prisma.reward.create({
    data: {
      ...data,
      programId,
      programEnrollments: {
        connect: partnerIds?.map((id) => ({ id })),
      },
    },
  });

  console.log("POST /api/programs/[programId]/rewards", reward);

  return NextResponse.json(RewardSchema.parse(reward));
});
