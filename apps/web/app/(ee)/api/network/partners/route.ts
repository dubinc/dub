import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  DiscoverablePartnerSchema,
  getDiscoverablePartnersQuerySchema,
} from "@/lib/zod/schemas/partner-discovery";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/partners - get all available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { page, pageSize } =
      getDiscoverablePartnersQuerySchema.parse(searchParams);

    const partners = (await prisma.$queryRaw`
      SELECT 
        p.*,
        industryInterests.industryInterests,
        preferredEarningStructures.preferredEarningStructures,
        salesChannels.salesChannels,
        metrics.lastConversionAt as lastConversionAt
      FROM 
        Partner p
      -- Any associated program enrollment
      LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
      -- Metrics (lastConversionAt)
      LEFT JOIN (
        SELECT 
          partnerId,
          MAX(lastConversionAt) as lastConversionAt
        FROM Link
        GROUP BY partnerId
      ) metrics ON metrics.partnerId = p.id
      -- Profile field lists
      LEFT JOIN (
        SELECT partnerId, group_concat(industryInterest) AS industryInterests
        FROM PartnerIndustryInterest
        GROUP BY partnerId
      ) industryInterests ON industryInterests.partnerId = p.id
      LEFT JOIN (
        SELECT partnerId, group_concat(preferredEarningStructure) AS preferredEarningStructures
        FROM PartnerPreferredEarningStructure
        GROUP BY partnerId
      ) preferredEarningStructures ON preferredEarningStructures.partnerId = p.id
      LEFT JOIN (
        SELECT partnerId, group_concat(salesChannel) AS salesChannels
        FROM PartnerSalesChannel
        GROUP BY partnerId
      ) salesChannels ON salesChannels.partnerId = p.id
      WHERE 
        p.discoverableAt IS NOT NULL
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

    return NextResponse.json(
      z.array(DiscoverablePartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          industryInterests: partner.industryInterests?.split(",") || undefined,
          preferredEarningStructures:
            partner.preferredEarningStructures?.split(",") || undefined,
          salesChannels: partner.salesChannels?.split(",") || undefined,
        })),
      ),
    );
  },
  {
    requiredPlan: ["enterprise"],
  },
);
