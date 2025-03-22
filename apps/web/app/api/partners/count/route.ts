import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { programId } = searchParams;

    if (!programId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Program ID not found. Did you forget to include a `programId` query parameter?",
      });
    }

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

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
              status: status || { notIn: ["rejected", "banned"] },
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
      const [customRewardsPartners, allRewards] = await Promise.all([
        prisma.partnerReward.groupBy({
          by: ["rewardId"],
          where: {
            programEnrollment: {
              programId,
              status: status || { notIn: ["rejected", "banned"] },
              partner: {
                ...(country && {
                  country,
                }),
                ...commonWhere,
              },
            },
          },
          _count: true,
        }),
        prisma.reward.findMany({
          where: {
            programId,
            // TODO: remove this once we can filter by that too
            id: {
              not: program.defaultRewardId ?? undefined,
            },
          },
        }),
        // prisma.programEnrollment.count({
        //   where: {
        //     rewards: {
        //       none: {},
        //     },
        //   },
        // }),
      ]);

      const partnersWithReward = allRewards
        .map((reward) => {
          const partnerCount = customRewardsPartners.find(
            (p) => p.rewardId === reward.id,
          )?._count;

          return {
            ...reward,
            partnersCount: partnerCount,
          };
        })
        .sort((a, b) => (b.partnersCount ?? 0) - (a.partnersCount ?? 0));

      return NextResponse.json(partnersWithReward);
    }

    // Get absolute count of partners
    const count = await prisma.programEnrollment.count({
      where: {
        programId,
        status: status || { notIn: ["rejected", "banned"] },
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
