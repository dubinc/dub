import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getPartnerNetworkPartnersQuerySchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/network/partners/count - get the number of available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { page, pageSize } =
      getPartnerNetworkPartnersQuerySchema.parse(searchParams);

    const partnerWhere = {
      discoverableAt: { not: null },
    };

    const [all, invited, recruited] = await Promise.all([
      prisma.partner.count({
        where: {
          ...partnerWhere,
          programs: { none: { programId } },
          discoveredPartners: { none: { programId, ignoredAt: { not: null } } },
        },
      }),
      prisma.discoveredPartner.count({
        where: {
          programId,
          partner: {
            ...partnerWhere,
            programs: { none: { programId } },
          },
          invitedAt: {
            not: null,
          },
          ignoredAt: null,
        },
      }),
      prisma.discoveredPartner.count({
        where: {
          programId,
          partner: {
            ...partnerWhere,
            programs: { some: { programId, status: "approved" } },
          },
          invitedAt: {
            not: null,
          },
          ignoredAt: null,
        },
      }),
    ]);

    return NextResponse.json({
      total: all,
      discover: all - invited - recruited,
      invited,
      recruited,
    });
  },
  {
    requiredPlan: ["enterprise"],
  },
);
