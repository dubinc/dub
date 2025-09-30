import { getConversionScore } from "@/lib/actions/partners/get-conversion-score";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PartnerNetworkPartnerSchema,
  getPartnerNetworkPartnersQuerySchema,
} from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/partners - get all available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { status, page, pageSize, country, starred } =
      getPartnerNetworkPartnersQuerySchema.parse(searchParams);

    const partners = (await prisma.$queryRaw`
      SELECT 
        p.*,
        industryInterests.industryInterests,
        preferredEarningStructures.preferredEarningStructures,
        salesChannels.salesChannels,
        metrics.lastConversionAt as lastConversionAt,
        metrics.conversionRate as conversionRate,
        dp.starredAt as starredAt,
        dp.ignoredAt as ignoredAt,
        dp.invitedAt as invitedAt
      FROM 
        Partner p
      -- Any associated program enrollment
      LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
      -- Any associated discovered partner data
      LEFT JOIN DiscoveredPartner dp ON dp.partnerId = p.id AND dp.programId = ${programId}
      -- Metrics (lastConversionAt)
      LEFT JOIN (
        SELECT 
          partnerId,
          MAX(lastConversionAt) as lastConversionAt,
          SUM(conversions) / COALESCE(SUM(clicks), 0) as conversionRate
        FROM Link
        WHERE programId IS NOT NULL
        AND partnerId IS NOT NULL
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
      -- Ordering
      ${starred === true ? Prisma.sql`ORDER BY dp.starredAt DESC` : Prisma.sql``}
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

    return NextResponse.json(
      z.array(PartnerNetworkPartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
          industryInterests: partner.industryInterests?.split(",") || undefined,
          preferredEarningStructures:
            partner.preferredEarningStructures?.split(",") || undefined,
          salesChannels: partner.salesChannels?.split(",") || undefined,
          conversionScore:
            partner.conversionRate === null
              ? null
              : getConversionScore(partner.conversionRate),
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
