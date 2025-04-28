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
      pe.tenantId,
      pe.applicationId,
      pe.createdAt as enrollmentCreatedAt,
      pe.bannedAt,
      pe.bannedReason,
      COALESCE(metrics.totalClicks, 0) as totalClicks,
      COALESCE(metrics.totalLeads, 0) as totalLeads,
      COALESCE(metrics.totalSales, 0) as totalSales,
      COALESCE(metrics.totalSaleAmount, 0) as totalSaleAmount,
      COALESCE(commissions.totalCommissions, 0) as totalCommissions,
      COALESCE(metrics.totalSaleAmount, 0) - COALESCE(commissions.totalCommissions, 0) as netRevenue
    FROM 
      ProgramEnrollment pe 
    INNER JOIN 
      Partner p ON p.id = pe.partnerId 
    LEFT JOIN (
      SELECT 
        partnerId,
        SUM(clicks) as totalClicks,
        SUM(leads) as totalLeads,
        SUM(sales) as totalSales,
        SUM(saleAmount) as totalSaleAmount
      FROM Link
      WHERE programId = ${programId}
        AND partnerId = ${partnerId}
      GROUP BY partnerId
    ) metrics ON metrics.partnerId = pe.partnerId
    LEFT JOIN (
      SELECT 
        partnerId,
        SUM(earnings) as totalCommissions
      FROM Commission
      WHERE earnings > 0
        AND programId = ${programId}
        AND partnerId = ${partnerId}
        AND status IN ('pending', 'processed', 'paid')
      GROUP BY partnerId
    ) commissions ON commissions.partnerId = pe.partnerId
    WHERE 
      pe.partnerId = ${partnerId}
      AND pe.programId = ${programId}
      AND pe.status NOT IN ('rejected', 'banned')
  `;

  if (!partner?.[0]) return null;

  return {
    ...partner[0],
    createdAt: new Date(partner[0].enrollmentCreatedAt),
    clicks: Number(partner[0].totalClicks),
    leads: Number(partner[0].totalLeads),
    sales: Number(partner[0].totalSales),
    saleAmount: Number(partner[0].totalSaleAmount),
    commissions: Number(partner[0].totalCommissions),
    netRevenue: Number(partner[0].netRevenue),
  };
}
