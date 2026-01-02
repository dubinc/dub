import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ workspace, params }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const reward = await prisma.reward.findUnique({
    where: {
      id: params.rewardId,
      programId,
    },
  });

  if (!reward) {
    throw new DubApiError({
      code: "not_found",
      message: "Reward not found.",
    });
  }

  return NextResponse.json(RewardSchema.parse(reward));
});
