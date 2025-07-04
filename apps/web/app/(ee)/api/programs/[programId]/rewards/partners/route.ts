import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  rewardPartnersQuerySchema,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewards/partners – get partners that are part of a reward rule
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { rewardId } = rewardPartnersQuerySchema.parse(searchParams);

  const reward = await getRewardOrThrow({
    rewardId,
    programId,
  });

  // For the default reward, return only non-eligible partners
  // For other rewards, return all eligible partners
  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.default
        ? null
        : rewardId,
      status: {
        in: ["approved", "invited"],
      },
    },
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
    orderBy: {
      partner: {
        name: "asc",
      },
    },
  });

  return NextResponse.json(partners.map(({ partner }) => partner));
});
