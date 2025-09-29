import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getDiscoverablePartnersQuerySchema } from "@/lib/zod/schemas/partner-discovery";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/network/partners/count - get the number of available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { page, pageSize } =
      getDiscoverablePartnersQuerySchema.parse(searchParams);

    const data = (await prisma.$queryRaw`
      SELECT 
        COUNT(*) AS discover
      FROM 
        Partner p
      -- Any associated program enrollment
      LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
      -- Metrics (lastConversionAt)
      -- LEFT JOIN (
      --   SELECT 
      --     partnerId,
      --     MAX(lastConversionAt) as lastConversionAt,
      --     SUM(conversions) / COALESCE(SUM(clicks), 0) as conversionRate
      --   FROM Link
      --   WHERE programId IS NOT NULL
      --   AND partnerId IS NOT NULL
      --   GROUP BY partnerId
      -- ) metrics ON metrics.partnerId = p.id
      -- Profile field lists
      -- LEFT JOIN (
      --   SELECT partnerId, group_concat(industryInterest) AS industryInterests
      --   FROM PartnerIndustryInterest
      --   GROUP BY partnerId
      -- ) industryInterests ON industryInterests.partnerId = p.id
      -- LEFT JOIN (
      --   SELECT partnerId, group_concat(preferredEarningStructure) AS preferredEarningStructures
      --   FROM PartnerPreferredEarningStructure
      --   GROUP BY partnerId
      -- ) preferredEarningStructures ON preferredEarningStructures.partnerId = p.id
      -- LEFT JOIN (
      --   SELECT partnerId, group_concat(salesChannel) AS salesChannels
      --   FROM PartnerSalesChannel
      --   GROUP BY partnerId
      -- ) salesChannels ON salesChannels.partnerId = p.id
      WHERE 
        p.discoverableAt IS NOT NULL
        AND pe.id IS NULL`) satisfies Array<any>;

    return NextResponse.json({
      discover: Number(data[0].discover),
    });
  },
  {
    requiredPlan: ["enterprise"],
  },
);
