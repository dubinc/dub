import { withPartnerProfile } from "@/lib/auth/partner";
import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs - get all enrolled programs for a given partnerId
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { includeRewardsDiscounts } = searchParams;

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
      program: includeRewardsDiscounts
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
      ...(includeRewardsDiscounts && {
        clickReward: true,
        leadReward: true,
        saleReward: true,
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
        ? sortRewardsByEventOrder(
            [
              enrollment.clickReward,
              enrollment.leadReward,
              enrollment.saleReward,
            ].filter((r): r is Reward => r !== null),
          )
        : [],
    };
  });

  return NextResponse.json(z.array(ProgramEnrollmentSchema).parse(response));
});
