import { withPartnerProfile } from "@/lib/auth/partner";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs - get all enrolled programs for a given partnerId
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: partner.id,
    },
    include: {
      links: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
      },
      ...(searchParams.includeRewardsDiscounts && {
        clickReward: { include: { partnerClickReward: true } },
        leadReward: { include: { partnerLeadReward: true } },
        saleReward: { include: { partnerSaleReward: true } },
      }),
      program: searchParams.includeRewardsDiscounts
        ? {
            include: {
              discounts: {
                where: {
                  OR: [
                    // program-wide discounts
                    {
                      programEnrollments: {
                        none: {},
                      },
                    },

                    // partner-specific discounts
                    {
                      programEnrollments: {
                        some: {
                          partnerId: partner.id,
                        },
                      },
                    },
                  ],
                },
              },
            },
          }
        : true,
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
    const { clickReward, leadReward, saleReward, ...rest } = enrollment;

    return {
      ...rest,
      rewards: [saleReward, leadReward, clickReward].filter(Boolean),
    };
  });

  return NextResponse.json(z.array(ProgramEnrollmentSchema).parse(response));
});
