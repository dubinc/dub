import { getConversionScore } from "@/lib/actions/partners/get-conversion-score";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  NetworkPartnerSchema,
  getNetworkPartnersQuerySchema,
} from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/partners - get all available partners in the network
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

    const partners = (await prisma.$queryRaw`
      SELECT 
        p.*,
        industryInterests.industryInterests,
        preferredEarningStructures.preferredEarningStructures,
        salesChannels.salesChannels,
        metrics.lastConversionAt as lastConversionAt,
        metrics.conversionRate as conversionRate,
        metrics.averageLifetimeValue as averageLifetimeValue,
        COALESCE(commissions.totalCommissions, 0) as totalCommissions,
        COALESCE(commissions.totalProgramsWithEarnings, 0) as totalProgramsWithEarnings,
        dp.starredAt as starredAt,
        dp.ignoredAt as ignoredAt,
        dp.invitedAt as invitedAt,
        case
          when pe.status = 'approved' then pe.createdAt
          else null
        end as recruitedAt,
        -- Calculate ranking score components
        CASE 
          WHEN metrics.lastConversionAt IS NULL THEN 0
          WHEN DATEDIFF(NOW(), metrics.lastConversionAt) <= 7 THEN 100
          WHEN DATEDIFF(NOW(), metrics.lastConversionAt) >= 180 THEN 5
          ELSE GREATEST(5, 100 * EXP(-0.02 * DATEDIFF(NOW(), metrics.lastConversionAt)))
        END as recencyScore,
        CASE 
          WHEN COALESCE(metrics.conversionRate, 0) <= 0 THEN 0
          WHEN COALESCE(metrics.conversionRate, 0) >= 0.1 THEN 100
          -- Less punitive for high-volume partners: use square root to soften the penalty
          ELSE LEAST(100, GREATEST(0, SQRT(LOG10(COALESCE(metrics.conversionRate, 0) * 1000 + 1)) * 40))
        END as conversionRateScore,
        CASE 
          WHEN COALESCE(metrics.averageLifetimeValue, 0) <= 0 THEN 0
          WHEN COALESCE(metrics.averageLifetimeValue, 0) >= 10000 THEN 100
          ELSE LEAST(100, GREATEST(0, LOG10(COALESCE(metrics.averageLifetimeValue, 0) + 1) * 25))
        END as lifetimeValueScore,
        CASE 
          WHEN COALESCE(commissions.totalProgramsWithEarnings, 0) <= 0 THEN 0
          WHEN COALESCE(commissions.totalProgramsWithEarnings, 0) >= 20 THEN 100
          -- Enhanced scoring for program diversity: exponential curve for 10+ programs
          WHEN COALESCE(commissions.totalProgramsWithEarnings, 0) >= 10 THEN 
            LEAST(100, 70 + (COALESCE(commissions.totalProgramsWithEarnings, 0) - 10) * 3)
          ELSE LEAST(100, SQRT(COALESCE(commissions.totalProgramsWithEarnings, 0)) * 22.36)
        END as programDiversityScore,
        CASE 
          WHEN COALESCE(commissions.totalCommissions, 0) <= 0 THEN 0
          WHEN COALESCE(commissions.totalCommissions, 0) >= 100000 THEN 100
          -- Enhanced scoring for high commission partners
          ELSE LEAST(100, GREATEST(0, LOG10(COALESCE(commissions.totalCommissions, 0) + 1) * 22))
        END as commissionsScore,
        -- Calculate weighted overall score (0-100) with adjusted weights for high-volume partners
        (
          (CASE 
            WHEN metrics.lastConversionAt IS NULL THEN 0
            WHEN DATEDIFF(NOW(), metrics.lastConversionAt) <= 7 THEN 100
            WHEN DATEDIFF(NOW(), metrics.lastConversionAt) >= 180 THEN 5
            ELSE GREATEST(5, 100 * EXP(-0.02 * DATEDIFF(NOW(), metrics.lastConversionAt)))
          END * 0.20) +
          (CASE 
            WHEN COALESCE(metrics.conversionRate, 0) <= 0 THEN 0
            WHEN COALESCE(metrics.conversionRate, 0) >= 0.1 THEN 100
            -- Less punitive for high-volume partners: use square root to soften the penalty
            ELSE LEAST(100, GREATEST(0, SQRT(LOG10(COALESCE(metrics.conversionRate, 0) * 1000 + 1)) * 40))
          END * 0.15) +
          (CASE 
            WHEN COALESCE(metrics.averageLifetimeValue, 0) <= 0 THEN 0
            WHEN COALESCE(metrics.averageLifetimeValue, 0) >= 10000 THEN 100
            ELSE LEAST(100, GREATEST(0, LOG10(COALESCE(metrics.averageLifetimeValue, 0) + 1) * 25))
          END * 0.20) +
          (CASE 
            WHEN COALESCE(commissions.totalProgramsWithEarnings, 0) <= 0 THEN 0
            WHEN COALESCE(commissions.totalProgramsWithEarnings, 0) >= 20 THEN 100
            -- Enhanced scoring for program diversity: exponential curve for 10+ programs
            WHEN COALESCE(commissions.totalProgramsWithEarnings, 0) >= 10 THEN 
              LEAST(100, 70 + (COALESCE(commissions.totalProgramsWithEarnings, 0) - 10) * 3)
            ELSE LEAST(100, SQRT(COALESCE(commissions.totalProgramsWithEarnings, 0)) * 22.36)
          END * 0.25) +
          (CASE 
            WHEN COALESCE(commissions.totalCommissions, 0) <= 0 THEN 0
            WHEN COALESCE(commissions.totalCommissions, 0) >= 100000 THEN 100
            -- Enhanced scoring for high commission partners
            ELSE LEAST(100, GREATEST(0, LOG10(COALESCE(commissions.totalCommissions, 0) + 1) * 22))
          END * 0.20)
        ) as overallScore
      FROM 
        Partner p
      -- Any associated program enrollment
      LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
      -- Any associated discovered partner data
      LEFT JOIN DiscoveredPartner dp ON dp.partnerId = p.id AND dp.programId = ${programId}
      -- Metrics (lastConversionAt, conversionRate)
      LEFT JOIN (
        SELECT 
          partnerId,
          MAX(lastConversionAt) as lastConversionAt,
          COALESCE(SUM(conversions) / SUM(clicks), 0) as conversionRate,
          COALESCE(SUM(saleAmount) / SUM(conversions), 0) as averageLifetimeValue
        FROM Link
        WHERE programId IS NOT NULL
        AND programId != ${ACME_PROGRAM_ID} -- Exclude test data
        AND partnerId IS NOT NULL
        GROUP BY partnerId
      ) metrics ON metrics.partnerId = p.id
      -- Total commissions and programs with earnings
      LEFT JOIN (
        SELECT 
          partnerId,
          SUM(totalCommissions) as totalCommissions,
          COUNT(CASE WHEN totalCommissions > 0 THEN 1 END) as totalProgramsWithEarnings
        FROM ProgramEnrollment
        WHERE programId != ${ACME_PROGRAM_ID} -- Exclude test data
        AND status = 'approved'
        GROUP BY partnerId
      ) commissions ON commissions.partnerId = p.id
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
        AND dp.ignoredAt IS NULL
        AND conversionRate < 1 /* Exclude partners with a conversion rate of 1 and above (unrealistic) */
        ${partnerIds && partnerIds.length > 0 ? Prisma.sql`AND p.id IN (${Prisma.join(partnerIds)})` : Prisma.sql``}
        ${country ? Prisma.sql`AND p.country = ${country}` : Prisma.sql``}
        ${
          status === "discover"
            ? Prisma.sql`AND pe.id IS NULL`
            : status === "invited"
              ? Prisma.sql`AND pe.status = 'invited' AND dp.invitedAt IS NOT NULL`
              : Prisma.sql`AND pe.status = 'approved' AND dp.invitedAt IS NOT NULL`
        }
        ${starred === true ? Prisma.sql`AND dp.starredAt IS NOT NULL` : Prisma.sql``}
        ${starred === false ? Prisma.sql`AND dp.starredAt IS NULL` : Prisma.sql``}
        ${industryInterests && industryInterests.length > 0 ? Prisma.sql`AND EXISTS (SELECT 1 FROM PartnerIndustryInterest WHERE partnerId = p.id AND industryInterest IN (${Prisma.join(industryInterests)}))` : Prisma.sql``}
        ${salesChannels && salesChannels.length > 0 ? Prisma.sql`AND EXISTS (SELECT 1 FROM PartnerSalesChannel WHERE partnerId = p.id AND salesChannel IN (${Prisma.join(salesChannels)}))` : Prisma.sql``}
        ${preferredEarningStructures && preferredEarningStructures.length > 0 ? Prisma.sql`AND EXISTS (SELECT 1 FROM PartnerPreferredEarningStructure WHERE partnerId = p.id AND preferredEarningStructure IN (${Prisma.join(preferredEarningStructures)}))` : Prisma.sql``}
      ORDER BY ${starred === true ? Prisma.sql`dp.starredAt DESC,` : Prisma.sql``} overallScore DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

    return NextResponse.json(
      z.array(NetworkPartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          industryInterests: partner.industryInterests?.split(",") || undefined,
          preferredEarningStructures:
            partner.preferredEarningStructures?.split(",") || undefined,
          salesChannels: partner.salesChannels?.split(",") || undefined,
          conversionScore: getConversionScore(partner.conversionRate || 0),
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
