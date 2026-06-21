import { DubApiError } from "@/lib/api/errors";
import {
  partnerNetworkListingParts,
  partnerWhereFromListingParts,
} from "@/lib/api/network/partner-network-listing-where";
import { reachTiersToRanges } from "@/lib/api/network/reach-tiers";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNetworkPartnersCountQuerySchema } from "@/lib/zod/schemas/partner-network";
import { Prisma } from "@prisma/client";
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

    const { partnerIds, status, groupBy, country, starred, platform, reach } =
      getNetworkPartnersCountQuerySchema.parse(searchParams);

    const listingParts = partnerNetworkListingParts({
      partnerIds,
      country,
      platform,
    });

    const commonWhere = partnerWhereFromListingParts(listingParts);

    // Reach is a discover-only filter. Approximate the ranking's "max subscribers
    // across selected platforms in tier" with a `some` test (a selected platform
    // whose subscribers fall in a chosen tier) so pagination totals track the
    // filtered discover results. Applied only to discover-scoped counts below.
    const reachRanges = reach?.length ? reachTiersToRanges(reach) : [];
    const reachWhere: Prisma.PartnerWhereInput = reachRanges.length
      ? {
          platforms: {
            some: {
              verifiedAt: { not: null },
              ...(platform?.length && { type: { in: platform } }),
              OR: reachRanges.map(({ min, max }) => ({
                subscribers: {
                  gte: BigInt(min),
                  ...(max != null && { lt: BigInt(max) }),
                },
              })),
            },
          },
        }
      : {};

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
      ignored: {
        programs: { none: { programId } },
        discoveredByPrograms: {
          some: { programId, ignoredAt: { not: null } },
        },
      },
    } as const;

    const statusWhereForFacet =
      status && status in statusWheres
        ? statusWheres[status as keyof typeof statusWheres]
        : statusWheres.discover;

    if (groupBy === "status") {
      const [discover, invited, recruited, ignored] = await Promise.all([
        !status || status === "discover"
          ? prisma.partner.count({
              where: {
                ...commonWhere,
                ...statusWheres.discover,
                ...reachWhere,
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
        !status || status === "ignored"
          ? prisma.partner.count({
              where: {
                ...commonWhere,
                ...statusWheres.ignored,
              },
            })
          : undefined,
      ]);

      return NextResponse.json({
        discover,
        invited,
        recruited,
        ignored,
      });
    } else if (groupBy === "country") {
      const countries = await prisma.partner.groupBy({
        by: ["country"],
        _count: true,
        where: {
          ...commonWhere,
          ...statusWhereForFacet,
          ...(!status || status === "discover" ? reachWhere : {}),
        },
        orderBy: {
          _count: {
            country: "desc",
          },
        },
      });

      return NextResponse.json(countries);
    }

    throw new Error("Invalid groupBy");
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);
