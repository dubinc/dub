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

    const commonRewardWhere: Prisma.ProgramEnrollmentWhereInput = {
      ...(clickRewardId && {
        clickRewardId,
      }),
      ...(leadRewardId && {
        leadRewardId,
      }),
      ...(saleRewardId && {
        saleRewardId,
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
              ...commonRewardWhere,
            },
            every: {
              status: status || {
                in: ["approved", "invited"],
              },
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
          ...commonRewardWhere,
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
      const [rewardPartners, rewards] = await Promise.all([
        prisma.programEnrollment.groupBy({
          by: [groupBy],
          where: {
            programId,
            status: status || {
              in: ["approved", "invited"],
            },
            partner: {
              ...(country && {
                country,
              }),
              ...commonWhere,
            },
          },
          _count: true,
          orderBy: {
            _count: {
              [groupBy]: "desc",
            },
          },
        }),

        prisma.reward.findMany({
          where: {
            programId,
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

      const partnersWithReward = rewards
        .map((r) => {
          return {
            ...r,
            partnersCount:
              rewardPartners.find((p) => p[groupBy] === r.id)?._count ?? 0,
          };
        })
        .sort((a, b) => (b.partnersCount ?? 0) - (a.partnersCount ?? 0));

      return NextResponse.json(partnersWithReward);
    }

    // Get absolute count of partners
    const count = await prisma.programEnrollment.count({
      where: {
        programId,
        status: status || {
          in: ["approved", "invited"],
        },
        ...commonRewardWhere,
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
