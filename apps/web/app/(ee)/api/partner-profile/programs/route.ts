import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileProgramsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs - get all program enrollments for a given partnerId
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { includeRewardsDiscounts, status } =
    partnerProfileProgramsQuerySchema.parse(searchParams);

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: partner.id,
      ...(status && { status }),
    },
    include: {
      links: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
      },
      program: {
        include: {
          workspace: {
            select: {
              plan: true,
            },
          },
        },
      },
      ...(includeRewardsDiscounts && {
        clickReward: true,
        leadReward: true,
        saleReward: true,
        discount: true,
      }),
    },
    orderBy: [
      {
        totalCommissions: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  const response = programEnrollments.map((enrollment) => {
    return {
      ...enrollment,
      rewards: includeRewardsDiscounts
        ? [
            enrollment.clickReward,
            enrollment.leadReward,
            enrollment.saleReward,
          ].filter((r): r is Reward => r !== null)
        : [],
    };
  });

  return NextResponse.json(z.array(ProgramEnrollmentSchema).parse(response));
});
