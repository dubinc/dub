import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { rewardPartnersQuerySchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewards/partners
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { rewardId, page, pageSize, event } =
      rewardPartnersQuerySchema.parse(searchParams);

    const partners = await prisma.programEnrollment.findMany({
      where: {
        programId,
        NOT: {
          rewards: {
            some: {
              reward: {
                ...(rewardId && { id: rewardId }),
                ...(event && { event }),
              },
            },
          },
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const flatPartners = partners.map(({ partner }) => partner);

    return NextResponse.json(flatPartners);

    // await prisma.reward.findUniqueOrThrow({
    //   where: {
    //     id: rewardId,
    //     programId,
    //   },
    // });

    // const partners = await prisma.partnerReward.findMany({
    //   where: {
    //     rewardId,
    //   },
    //   select: {
    //     programEnrollment: {
    //       select: {
    //         partner: {
    //           select: {
    //             id: true,
    //             name: true,
    //             image: true,
    //             email: true,
    //           },
    //         },
    //       },
    //     },
    //   },
    //   skip: (page - 1) * pageSize,
    //   take: pageSize,
    // });

    // const flatPartners = partners.map(
    //   ({ programEnrollment: { partner } }) => partner,
    // );

    // return NextResponse.json(flatPartners);
  },
);
