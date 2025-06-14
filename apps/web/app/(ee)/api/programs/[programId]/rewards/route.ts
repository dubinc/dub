import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/rewards - get all rewards for a program
export const GET = withWorkspace(async ({ workspace }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const rewards = await prisma.reward.findMany({
    where: {
      programId,
    },
    orderBy: [
      {
        default: "desc",
      },
      {
        event: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return NextResponse.json(z.array(RewardSchema).parse(rewards));
});
