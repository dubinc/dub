import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { rewardPartnersQuerySchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewards/partners – get partners that are part of a reward rule
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { rewardId } = rewardPartnersQuerySchema.parse(searchParams);

  await getRewardOrThrow({
    rewardId,
    programId,
  });

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
    orderBy: {
      programEnrollment: {
        partner: {
          name: "asc",
        },
      },
    },
  });

  const flatPartners = partners.map(
    ({ programEnrollment: { partner } }) => partner,
  );

  return NextResponse.json(flatPartners);
});
