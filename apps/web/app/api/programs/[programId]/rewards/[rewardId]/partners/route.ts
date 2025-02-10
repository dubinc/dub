import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// TODO:
// Add pagination

// GET /api/programs/[programId]/rewards/[rewardId]/partners - get all partners for a reward
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId, rewardId } = params;

  await Promise.all([
    getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    }),

    prisma.reward.findUniqueOrThrow({
      where: {
        id: rewardId,
        programId,
      },
    }),
  ]);

  const partners = await prisma.partnerReward.findMany({
    where: {
      rewardId,
    },
    select: {
      programEnrollment: {
        select: {
          partner: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    partners.map(({ programEnrollment: { partner } }) => partner),
  );
});
