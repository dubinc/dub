import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getPaginationQuerySchema } from "@/lib/zod/schemas/misc";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

const getPartnersQuerySchema = getPaginationQuerySchema({
  pageSize: 25,
});

// GET /api/programs/[programId]/rewards/[rewardId]/partners - get partners assigned to a reward
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
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

    const { page, pageSize } = getPartnersQuerySchema.parse(searchParams);

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
