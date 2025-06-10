import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { groupBy, status, country, rewardId, search, ids } =
      partnersCountQuerySchema.parse(searchParams);

    const commonWhere: Prisma.PartnerWhereInput = {
      ...(search && {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }),
      ...(ids && {
        id: { in: ids },
      }),
    };

    // Get partner count by country
    if (groupBy === "country") {
      const partners = await prisma.partner.groupBy({
        by: ["country"],
        where: {
          programs: {
            some: {
              programId,
              ...(rewardId && {
                rewards: {
                  some: {
                    rewardId,
                  },
                },
              }),
            },
            every: {
              status: status || { notIn: ["rejected", "banned", "archived"] },
            },
          },
          ...commonWhere,
        },
        _count: true,
        orderBy: {
          _count: {
            country: "desc",
          },
        },
      });

      return NextResponse.json(partners);
    }

    // Get partner count by status
    if (groupBy === "status") {
      const partners = await prisma.programEnrollment.groupBy({
        by: ["status"],
        where: {
          programId,
          ...(rewardId && {
            rewards: {
              some: {
                rewardId,
              },
            },
          }),
          partner: {
            ...(country && {
              country,
            }),
            ...commonWhere,
          },
        },
        _count: true,
      });

      // Find missing statuses
      const missingStatuses = Object.values(ProgramEnrollmentStatus).filter(
        (status) => !partners.some((p) => p.status === status),
      );

      // Add missing statuses with count 0
      missingStatuses.forEach((status) => {
        partners.push({ _count: 0, status });
      });

      // order by count
      partners.sort((a, b) => (b._count ?? 0) - (a._count ?? 0));

      return NextResponse.json(partners);
    }

    // Get partner count by reward
    if (groupBy === "rewardId") {
      const [rewards, rewardsCounts] = await Promise.all([
        prisma.reward.findMany({
          where: {
            programId,
            default: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),

        prisma.$queryRaw<{ id: string; partnersCount: number }[]>`
          SELECT clickRewardId AS id, COUNT(*) AS partnersCount
          FROM ProgramEnrollment
          WHERE clickRewardId IS NOT NULL
          GROUP BY clickRewardId

          UNION ALL

          SELECT leadRewardId AS id, COUNT(*) AS partnersCount
          FROM ProgramEnrollment
          WHERE leadRewardId IS NOT NULL
          GROUP BY leadRewardId

          UNION ALL

          SELECT saleRewardId AS id, COUNT(*) AS partnersCount
          FROM ProgramEnrollment
          WHERE saleRewardId IS NOT NULL
          GROUP BY saleRewardId
        `,
      ]);

      const partnersWithReward = rewards.map((reward) => {
        const partnersCount =
          rewardsCounts.find((r) => r.id === reward.id)?.partnersCount ?? 0;

        return {
          ...reward,
          partnersCount: Number(partnersCount),
        };
      });

      return NextResponse.json(partnersWithReward);
    }

    // Get absolute count of partners
    const count = await prisma.programEnrollment.count({
      where: {
        programId,
        status: status || { notIn: ["rejected", "banned", "archived"] },
        ...(rewardId && {
          rewards: {
            some: {
              rewardId,
            },
          },
        }),
        partner: {
          ...(country && {
            country,
          }),
          ...commonWhere,
        },
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
