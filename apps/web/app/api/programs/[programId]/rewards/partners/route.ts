import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { rewardPartnersQuerySchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewards/partners – get partners that are part of a reward rule
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const { rewardId, page, pageSize } =
      rewardPartnersQuerySchema.parse(searchParams);

    await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getRewardOrThrow({
        rewardId,
        programId,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const flatPartners = partners.map(
      ({ programEnrollment: { partner } }) => partner,
    );

    return NextResponse.json(flatPartners);
  },
);
