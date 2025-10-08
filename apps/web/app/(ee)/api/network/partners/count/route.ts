import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getNetworkPartnersCountQuerySchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

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
      salesChannels,
      preferredEarningStructures,
    } = getNetworkPartnersCountQuerySchema.parse(searchParams);

    const commonWhere = {
      ...(partnerIds && {
        id: { in: partnerIds },
      }),
      ...(country && {
        country,
      }),
      ...(salesChannels && {
        salesChannels: { some: { salesChannel: { in: salesChannels } } },
      }),
      ...(preferredEarningStructures && {
        preferredEarningStructures: {
          some: {
            preferredEarningStructure: { in: preferredEarningStructures },
          },
        },
      }),
    };

    const statusWheres = {
      discover: {
        programs: { none: { programId } },
        discoveredByPrograms: {
          none: { programId, ignoredAt: { not: null } },
        },
      },
      invited: {
        programs: { some: { programId, status: "invited" } },
        discoveredByPrograms: {
          some: {
            programId,
            invitedAt: { not: null },
            ignoredAt: null,
          },
        },
      },
      recruited: {
        programs: { some: { programId, status: "approved" } },
        discoveredByPrograms: {
          some: {
            programId,
            invitedAt: { not: null },
            ignoredAt: null,
          },
        },
      },
    } as const;

    const addStarredFilter = (baseWhere: any) => {
      if (starred === undefined) return baseWhere;

      const starredCondition = starred
        ? {
            discoveredByPrograms: {
              some: { programId, starredAt: { not: null }, ignoredAt: null },
            },
          }
        : {
            discoveredByPrograms: {
              none: { programId, starredAt: { not: null } },
            },
          };

      return {
        AND: [baseWhere, starredCondition],
      };
    };

    if (groupBy === "status") {
      const [discover, invited, recruited] = await Promise.all([
        !status || status === "discover"
          ? prisma.partner.count({
              where: addStarredFilter({
                ...commonWhere,
                ...statusWheres.discover,
              }),
            })
          : undefined,
        !status || status === "invited"
          ? prisma.partner.count({
              where: addStarredFilter({
                ...commonWhere,
                ...statusWheres.invited,
              }),
            })
          : undefined,
        !status || status === "recruited"
          ? prisma.partner.count({
              where: addStarredFilter({
                ...commonWhere,
                ...statusWheres.recruited,
              }),
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
        where: addStarredFilter({
          ...commonWhere,
          ...statusWheres[status || "discover"],
        }),
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
    requiredPlan: ["enterprise"],
  },
);
