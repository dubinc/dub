import { getConversionScore } from "@/lib/actions/partners/get-conversion-score";
import { DubApiError } from "@/lib/api/errors";
import { getImprovedPartnerRanking2 } from "@/lib/api/network/improved-partner-ranking";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  NetworkPartnerSchema,
  getNetworkPartnersQuerySchema,
} from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/partners - get all available partners in the network (IMPROVED VERSION)
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        categories: true,
      },
    });

    if (!program.partnerNetworkEnabledAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });
    }

    const {
      partnerIds,
      status,
      page,
      pageSize,
      country,
      starred,
      salesChannels,
      preferredEarningStructures,
    } = getNetworkPartnersQuerySchema.parse(searchParams);

    const partners = await getImprovedPartnerRanking2({
      programId,
      partnerIds,
      status,
      country,
      starred,
      salesChannels,
      preferredEarningStructures,
      page,
      pageSize,
    });

    return NextResponse.json(
      z.array(NetworkPartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          preferredEarningStructures:
            partner.preferredEarningStructures?.split(",") || undefined,
          salesChannels: partner.salesChannels?.split(",") || undefined,
          conversionScore: getConversionScore(partner.conversionRate),
          starredAt: partner.starredAt ? new Date(partner.starredAt) : null,
          ignoredAt: partner.ignoredAt ? new Date(partner.ignoredAt) : null,
          invitedAt: partner.invitedAt ? new Date(partner.invitedAt) : null,
        })),
      ),
    );
  },
  {
    requiredPlan: ["enterprise"],
  },
);
