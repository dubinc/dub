import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getPartnerNetworkPartnersCountQuerySchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/network/partners/count - get the number of available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { status, groupBy } =
      getPartnerNetworkPartnersCountQuerySchema.parse(searchParams);

    const commonWhere = {
      discoverableAt: { not: null },
    };

    const statusWheres = {
      discover: {
        programs: { none: { programId } },
        discoveredPartners: { none: { programId, ignoredAt: { not: null } } },
      },
      invited: {
        programs: { some: { programId, status: "invited" } },
        discoveredPartners: {
          some: { programId, invitedAt: { not: null }, ignoredAt: null },
        },
      },
      recruited: {
        programs: { some: { programId, status: "approved" } },
        discoveredPartners: {
          some: { programId, invitedAt: { not: null } },
        },
      },
    } as const;

    if (groupBy === "status") {
      const [discover, invited, recruited] = await Promise.all([
        prisma.partner.count({
          where: {
            ...commonWhere,
            ...statusWheres.discover,
          },
        }),
        prisma.partner.count({
          where: {
            ...commonWhere,
            ...statusWheres.invited,
          },
        }),
        prisma.partner.count({
          where: {
            ...commonWhere,
            ...statusWheres.recruited,
          },
        }),
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
      });

      return NextResponse.json(countries);
    }

    throw new Error("Invalid groupBy");
  },
  {
    requiredPlan: ["enterprise"],
  },
);
