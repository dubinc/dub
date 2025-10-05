import { prisma } from "@dub/prisma";

export async function getPartnerForProgram({
  programId,
  partnerId,
}: {
  programId: string;
  partnerId: string;
}) {
  const partner = await prisma.$queryRaw<any[]>`
    SELECT 
      p.*, 
      pe.id as enrollmentId, 
      pe.status,
      pe.programId,
      pe.partnerId,
      pe.groupId,
      pe.discountId,
      pe.tenantId,
      pe.applicationId,
      pe.createdAt as enrollmentCreatedAt,
      pe.bannedAt,
      pe.bannedReason,
      COALESCE(metrics.totalClicks, 0) as totalClicks,
      COALESCE(metrics.totalLeads, 0) as totalLeads,
      COALESCE(metrics.totalConversions, 0) as totalConversions,
      COALESCE(metrics.totalSales, 0) as totalSales,
      COALESCE(metrics.totalSaleAmount, 0) as totalSaleAmount,
      COALESCE(pe.totalCommissions, 0) as totalCommissions,
      COALESCE(metrics.totalSaleAmount, 0) - COALESCE(pe.totalCommissions, 0) as netRevenue,
      metrics.lastLeadAt,
      metrics.lastConversionAt,
      COALESCE(
        JSON_ARRAYAGG(
          IF(l.id IS NOT NULL,
            JSON_OBJECT(
              'id', l.id,
              'domain', l.domain,
              'key', l.\`key\`,
              'shortLink', l.shortLink,
              'url', l.url,
              'clicks', CAST(l.clicks AS SIGNED),
              'leads', CAST(l.leads AS SIGNED),
              'conversions', CAST(l.conversions AS SIGNED),
              'sales', CAST(l.sales AS SIGNED),
              'saleAmount', CAST(l.saleAmount AS SIGNED)
            ),
            NULL
          )
        ),
        JSON_ARRAY()
      ) as links,
      industryInterests.industryInterests,
      preferredEarningStructures.preferredEarningStructures,
      salesChannels.salesChannels
    FROM 
      ProgramEnrollment pe 
    INNER JOIN 
      Partner p ON p.id = pe.partnerId 
    LEFT JOIN Link l ON l.programId = pe.programId 
      AND l.partnerId = pe.partnerId
    LEFT JOIN (
      SELECT 
        partnerId,
        SUM(clicks) as totalClicks,
        SUM(leads) as totalLeads,
        SUM(conversions) as totalConversions,
        SUM(sales) as totalSales,
        SUM(saleAmount) as totalSaleAmount,
        MAX(lastLeadAt) as lastLeadAt,
        MAX(lastConversionAt) as lastConversionAt
      FROM Link
      WHERE programId = ${programId}
        AND partnerId = ${partnerId}
      GROUP BY partnerId
    ) metrics ON metrics.partnerId = pe.partnerId
    LEFT JOIN (
      SELECT partnerId, group_concat(industryInterest) AS industryInterests
      FROM PartnerIndustryInterest
      WHERE partnerId = ${partnerId}
      GROUP BY partnerId
    ) industryInterests ON industryInterests.partnerId = pe.partnerId
    LEFT JOIN (
      SELECT partnerId, group_concat(preferredEarningStructure) AS preferredEarningStructures
      FROM PartnerPreferredEarningStructure
      WHERE partnerId = ${partnerId}
      GROUP BY partnerId
    ) preferredEarningStructures ON preferredEarningStructures.partnerId = pe.partnerId
    LEFT JOIN (
      SELECT partnerId, group_concat(salesChannel) AS salesChannels
      FROM PartnerSalesChannel
      WHERE partnerId = ${partnerId}
      GROUP BY partnerId
    ) salesChannels ON salesChannels.partnerId = pe.partnerId
    WHERE 
      pe.partnerId = ${partnerId}
      AND pe.programId = ${programId}
    GROUP BY 
      p.id, pe.id, metrics.totalClicks, metrics.totalLeads, metrics.totalConversions, metrics.totalSales, metrics.totalSaleAmount, pe.totalCommissions, metrics.lastLeadAt, metrics.lastConversionAt
  `;

  if (!partner?.[0]) return null;

  return {
    ...partner[0],
    links: partner[0].links.filter((link: any) => link !== null && !!link.url),
    createdAt: new Date(partner[0].enrollmentCreatedAt),
    clicks: Number(partner[0].totalClicks),
    leads: Number(partner[0].totalLeads),
    conversions: Number(partner[0].totalConversions),
    sales: Number(partner[0].totalSales),
    saleAmount: Number(partner[0].totalSaleAmount),
    totalCommissions: Number(partner[0].totalCommissions),
    netRevenue: Number(partner[0].netRevenue),
    lastLeadAt: partner[0].lastLeadAt ? new Date(partner[0].lastLeadAt) : null,
    lastConversionAt: partner[0].lastConversionAt
      ? new Date(partner[0].lastConversionAt)
      : null,
    industryInterests: partner[0].industryInterests?.split(",") || undefined,
    preferredEarningStructures:
      partner[0].preferredEarningStructures?.split(",") || undefined,
    salesChannels: partner[0].salesChannels?.split(",") || undefined,
  };
}
