import { withPartnerProfile } from "@/lib/auth/partner";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
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

  let rewards: Reward[] = [];

  if (searchParams.includeRewardsDiscounts) {
    const partnerRewardIds = [
      ...new Set(
        programEnrollments
          .map(({ clickRewardId, leadRewardId, saleRewardId }) => [
            clickRewardId,
            leadRewardId,
            saleRewardId,
          ])
          .flat()
          .filter((id): id is string => id !== null),
      ),
    ];

    rewards = await prisma.reward.findMany({
      where: {
        id: {
          in: partnerRewardIds,
        },
      },
      orderBy: {
        event: "desc",
      },
    });
  }

  const programRewardsMap = rewards.reduce(
    (acc, reward) => {
      acc[reward.programId] = [...(acc[reward.programId] || []), reward];
      return acc;
    },
    {} as Record<string, Reward[]>,
  );

  const response = programEnrollments.map((enrollment) => {
    return {
      ...enrollment,
      rewards: programRewardsMap[enrollment.programId] || [],
    };
  });

  return NextResponse.json(z.array(ProgramEnrollmentSchema).parse(response));
});
