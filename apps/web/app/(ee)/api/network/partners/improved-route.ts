import { getConversionScore } from "@/lib/actions/partners/get-conversion-score";
import { DubApiError } from "@/lib/api/errors";
import { getImprovedPartnerRanking } from "@/lib/api/network/improved-partner-ranking";
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
        industryInterests: true,
      },
    });

    if (!program.partnerNetworkEnabledAt)
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });

    const programIndustryInterests = program.industryInterests.map(
      (interest) => interest.industryInterest,
    );

    const {
      partnerIds,
      status,
      page,
      pageSize,
      country,
      starred,
      industryInterests,
      salesChannels,
      preferredEarningStructures,
    } = getNetworkPartnersQuerySchema.parse(searchParams);

    // Use the improved ranking algorithm
    const partners = await getImprovedPartnerRanking({
      programId,
      programIndustryInterests,
      partnerIds,
      status,
      country,
      starred,
      industryInterests,
      salesChannels,
      preferredEarningStructures,
      page,
      pageSize,
    });

    console.table(partners, [
      "name",
      "email",
      "totalClicks",
      "totalLeads",
      "totalConversions",
      "conversionRate",
      "totalSaleAmount",
      "totalCommissions",
      "programSimilarityScore",
      "industryMatchScore",
      "enhancedCombinedScore",
    ]);

    return NextResponse.json(
      z.array(NetworkPartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          industryInterests: partner.industryInterests?.split(",") || undefined,
          preferredEarningStructures:
            partner.preferredEarningStructures?.split(",") || undefined,
          salesChannels: partner.salesChannels?.split(",") || undefined,
          conversionScore: getConversionScore(partner.conversionRate),
          starredAt: partner.starredAt ? new Date(partner.starredAt) : null,
          ignoredAt: partner.ignoredAt ? new Date(partner.ignoredAt) : null,
          invitedAt: partner.invitedAt ? new Date(partner.invitedAt) : null,
          // Add new enhanced scoring fields
          programSimilarityScore: partner.programSimilarityScore || 0,
          industryMatchScore: partner.industryMatchScore || 0,
          enhancedCombinedScore: partner.enhancedCombinedScore || 0,
        })),
      ),
    );
  },
  {
    requiredPlan: ["enterprise"],
  },
);
