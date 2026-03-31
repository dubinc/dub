import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getNetworkPartnersCountQuerySchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { PlatformType, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/network/partners/count - get the number of available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerNetworkEnabledAt } = await prisma.program.findUniqueOrThrow({
      select: {
        partnerNetworkEnabledAt: true,
      },
      where: {
        id: programId,
      },
    });

    if (!partnerNetworkEnabledAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });
    }

    const {
      partnerIds,
      status,
      groupBy,
      country,
      starred,
      platform,
      subscribers,
    } = getNetworkPartnersCountQuerySchema.parse(searchParams);

    // Build platform filter - combine platform type and subscribers if both are set
    const platformFilter: Prisma.PartnerPlatformWhereInput | undefined =
      platform || subscribers
        ? {
            verifiedAt: { not: null },
            ...(platform && { type: platform }),
            ...(subscribers === "<5000" && {
              subscribers: { lt: 5000 },
            }),
            ...(subscribers === "5000-25000" && {
              subscribers: { gte: 5000, lt: 25000 },
            }),
            ...(subscribers === "25000-100000" && {
              subscribers: { gte: 25000, lt: 100000 },
            }),
            ...(subscribers === "100000+" && {
              subscribers: { gte: 100000 },
            }),
          }
        : undefined;

    const commonWhere: Prisma.PartnerWhereInput = {
      discoverableAt: { not: null },
      ...(partnerIds && {
        id: { in: partnerIds },
      }),
      ...(country && {
        country,
      }),
      ...(platformFilter && {
        platforms: {
          some: platformFilter,
        },
      }),
    };

    const statusWheres = {
      discover: {
        programs: { none: { programId } },
        // Allow partners with no DiscoveredPartner record OR not ignored
        OR:
          starred === true
            ? [
                {
                  discoveredByPrograms: {
                    some: { programId, starredAt: { not: null } },
                  },
                },
              ]
            : starred === false
              ? [
                  { discoveredByPrograms: { none: { programId } } }, // No record yet
                  {
                    discoveredByPrograms: {
                      some: { programId, starredAt: null, ignoredAt: null },
                    },
                  }, // Not starred and not ignored
                ]
              : [
                  { discoveredByPrograms: { none: { programId } } }, // No record yet
                  {
                    discoveredByPrograms: {
                      some: { programId, ignoredAt: null },
                    },
                  }, // Has record but not ignored
                ],
      },
      invited: {
        programs: { some: { programId, status: "invited" } },
        discoveredByPrograms: {
          some: { programId, invitedAt: { not: null }, ignoredAt: null },
        },
      },
      recruited: {
        programs: { some: { programId, status: "approved" } },
        discoveredByPrograms: {
          some: { programId, invitedAt: { not: null } },
        },
      },
    } as const;

    if (groupBy === "status") {
      const [discover, invited, recruited] = await Promise.all([
        !status || status === "discover"
          ? prisma.partner.count({
              where: {
                ...commonWhere,
                ...statusWheres.discover,
              },
            })
          : undefined,
        !status || status === "invited"
          ? prisma.partner.count({
              where: {
                ...commonWhere,
                ...statusWheres.invited,
              },
            })
          : undefined,
        !status || status === "recruited"
          ? prisma.partner.count({
              where: {
                ...commonWhere,
                ...statusWheres.recruited,
              },
            })
          : undefined,
      ]);

      return NextResponse.json({
        discover,
        invited,
        recruited,
      });
    } else if (groupBy === "country") {
      const countries = await prisma.partner.groupBy({
        by: ["country"],
        _count: true,
        where: { ...commonWhere, ...statusWheres[status || "discover"] },
        orderBy: {
          _count: {
            country: "desc",
          },
        },
      });

      return NextResponse.json(countries);
    } else if (groupBy === "platform") {
      // Build platform filter for PartnerPlatform
      const platformPlatformFilter: Prisma.PartnerPlatformWhereInput = {
        verifiedAt: { not: null },
        ...(subscribers === "<5000" && {
          subscribers: { lt: 5000 },
        }),
        ...(subscribers === "5000-25000" && {
          subscribers: { gte: 5000, lt: 25000 },
        }),
        ...(subscribers === "25000-100000" && {
          subscribers: { gte: 25000, lt: 100000 },
        }),
        ...(subscribers === "100000+" && {
          subscribers: { gte: 100000 },
        }),
      };

      // Build partner where clause combining all filters
      const partnerWhere: Prisma.PartnerWhereInput = {
        ...commonWhere,
        ...statusWheres[status || "discover"],
        platforms: {
          some: platformPlatformFilter,
        },
      };

      // Get all partners matching the criteria with their platforms
      const partners = await prisma.partner.findMany({
        where: partnerWhere,
        select: {
          id: true,
          platforms: {
            where: platformPlatformFilter,
            select: {
              type: true,
            },
          },
        },
      });

      // Group by platform type and count distinct partners
      const platformCountsMap = new Map<PlatformType, Set<string>>();

      for (const partner of partners) {
        for (const platform of partner.platforms) {
          if (!platformCountsMap.has(platform.type)) {
            platformCountsMap.set(platform.type, new Set());
          }
          platformCountsMap.get(platform.type)!.add(partner.id);
        }
      }

      const platformCounts = Array.from(platformCountsMap.entries())
        .map(([type, partnerIds]) => ({
          platform: type,
          _count: partnerIds.size,
        }))
        .sort((a, b) => b._count - a._count);

      return NextResponse.json(platformCounts);
    } else if (groupBy === "subscribers") {
      // Get counts by subscriber ranges (only verified platforms)
      const subscriberRanges = [
        { label: "<5000", min: 0, max: 4999 },
        { label: "5000-25000", min: 5000, max: 24999 },
        { label: "25000-100000", min: 25000, max: 99999 },
        { label: "100000+", min: 100000, max: null },
      ];

      const subscriberCounts = await Promise.all(
        subscriberRanges.map(async (range) => {
          const where: Prisma.PartnerWhereInput = {
            ...commonWhere,
            ...statusWheres[status || "discover"],
            platforms: {
              some: {
                verifiedAt: { not: null },
                ...(range.max !== null
                  ? {
                      subscribers: { gte: range.min, lt: range.max + 1 },
                    }
                  : {
                      subscribers: { gte: range.min },
                    }),
                ...(platform && { type: platform }),
              },
            },
          };

          const count = await prisma.partner.count({ where });

          return {
            subscribers: range.label,
            _count: count,
          };
        }),
      );

      return NextResponse.json(subscriberCounts);
    }

    throw new Error("Invalid groupBy");
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);
