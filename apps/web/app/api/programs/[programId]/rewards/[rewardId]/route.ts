import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { rewardSchema, updateRewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/programs/[programId]/rewards/[rewardId] - update a reward
export const PATCH = withWorkspace(async ({ workspace, params, req }) => {
  const { programId, rewardId } = params;

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

  const { partnerIds, ...data } = updateRewardSchema.parse(
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

  const reward = await prisma.reward.update({
    where: {
      id: rewardId,
    },
    data: {
      ...data,
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

  // TODO:
  // Send an email to the partners about the reward being updated.

  return NextResponse.json(rewardSchema.parse(reward));
});

// DELETE /api/programs/[programId]/rewards/[rewardId] - delete a reward
export const DELETE = withWorkspace(async ({ workspace, params }) => {
  const { programId, rewardId } = params;

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  await prisma.reward.findUniqueOrThrow({
    where: {
      id: rewardId,
      programId,
    },
  });

  if (program.defaultRewardId === rewardId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Default reward cannot be deleted.",
    });
  }

  await prisma.reward.delete({
    where: {
      id: rewardId,
    },
  });

  // TODO:
  // Send an email to the partners about the reward being deleted.

  return NextResponse.json({ id: rewardId });
});
