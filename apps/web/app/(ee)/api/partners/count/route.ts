import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { EventType, Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      groupBy,
      status,
      country,
      clickRewardId,
      leadRewardId,
      saleRewardId,
      search,
      ids,
    } = partnersCountQuerySchema.parse(searchParams);

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
              ...(clickRewardId && {
                rewards: {
                  some: {
                    clickRewardId,
                  },
                },
              }),
              ...(leadRewardId && {
                rewards: {
                  some: {
                    leadRewardId,
                  },
                },
              }),
              ...(saleRewardId && {
                rewards: {
                  some: {
                    saleRewardId,
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
          ...(clickRewardId && {
            clickRewardId,
          }),
          ...(leadRewardId && {
            leadRewardId,
          }),
          ...(saleRewardId && {
            saleRewardId,
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
    if (
      groupBy &&
      ["clickRewardId", "leadRewardId", "saleRewardId"].includes(groupBy)
    ) {
      const [customRewardsPartners, customRewards] = await Promise.all([
        prisma.programEnrollment.groupBy({
          by: [groupBy],
          where: {
            programId,
            status: status || { notIn: ["rejected", "banned", "archived"] },
            partner: {
              ...(country && {
                country,
              }),
              ...commonWhere,
            },
          },
          _count: true,
        }),

        prisma.reward.findMany({
          where: {
            programId,
            default: false,
            ...(groupBy === "clickRewardId" && {
              event: EventType.click,
            }),
            ...(groupBy === "leadRewardId" && {
              event: EventType.lead,
            }),
            ...(groupBy === "saleRewardId" && {
              event: EventType.sale,
            }),
          },
        }),
      ]);

      const partnersWithReward = customRewards.map((r) => {
        return {
          ...r,
          partnersCount:
            customRewardsPartners.find((p) => p[groupBy] === r.id)?._count ?? 0,
        };
      });

      return NextResponse.json(partnersWithReward);
    }

    // Get absolute count of partners
    const count = await prisma.programEnrollment.count({
      where: {
        programId,
        status: status || { notIn: ["rejected", "banned", "archived"] },
        ...(clickRewardId && {
          clickRewardId,
        }),
        ...(leadRewardId && {
          leadRewardId,
        }),
        ...(saleRewardId && {
          saleRewardId,
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
