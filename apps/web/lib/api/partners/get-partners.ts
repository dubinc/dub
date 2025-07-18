import { partnersQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const sortColumnsMap = {
  createdAt: "pe.createdAt",
  clicks: "totalClicks",
  leads: "totalLeads",
  sales: "totalSales",
  saleAmount: "totalSaleAmount",
  commissions: "totalCommissions",
  netRevenue: "netRevenue",
};

// secondary sort column
const sortColumnExtraMap = {
  createdAt: "totalClicks",
  clicks: "totalLeads",
  leads: "totalSaleAmount",
  sales: "totalClicks",
  saleAmount: "totalClicks",
  commissions: "totalSaleAmount",
  netRevenue: "totalSaleAmount",
};

type PartnerFilters = z.infer<typeof partnersQuerySchema> & {
  workspaceId: string;
  programId: string;
};

export async function getPartners(filters: PartnerFilters) {
  const {
    status,
    country,
    clickRewardId,
    leadRewardId,
    saleRewardId,
    search,
    tenantId,
    ids,
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
  } = filters;

  const partners = (await prisma.$queryRaw`
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
      pe.clickRewardId,
      pe.leadRewardId,
      pe.saleRewardId,
      pe.discountId,
      COALESCE(metrics.totalClicks, 0) as totalClicks,
      COALESCE(metrics.totalLeads, 0) as totalLeads,
      COALESCE(metrics.totalSales, 0) as totalSales,
      COALESCE(metrics.totalSaleAmount, 0) as totalSaleAmount,
      COALESCE(pe.totalCommissions, 0) as totalCommissions,
      COALESCE(metrics.totalSaleAmount, 0) - COALESCE(pe.totalCommissions, 0) as netRevenue,
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
              'sales', CAST(l.sales AS SIGNED),
              'saleAmount', CAST(l.saleAmount AS SIGNED)
            ),
            NULL
          )
        ),
        JSON_ARRAY()
      ) as links
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
        SUM(sales) as totalSales,
        SUM(saleAmount) as totalSaleAmount
      FROM Link
      WHERE programId = ${programId}
        AND partnerId IS NOT NULL
        AND clicks > 0
      GROUP BY partnerId
    ) metrics ON metrics.partnerId = pe.partnerId
    WHERE 
      pe.programId = ${programId}
      ${status ? Prisma.sql`AND pe.status = ${status}` : Prisma.sql`AND pe.status NOT IN ('pending', 'rejected', 'banned', 'archived')`}
      ${tenantId ? Prisma.sql`AND pe.tenantId = ${tenantId}` : Prisma.sql``}
      ${country ? Prisma.sql`AND p.country = ${country}` : Prisma.sql``}
      ${clickRewardId ? Prisma.sql`AND pe.clickRewardId = ${clickRewardId}` : Prisma.sql``}
      ${leadRewardId ? Prisma.sql`AND pe.leadRewardId = ${leadRewardId}` : Prisma.sql``}
      ${saleRewardId ? Prisma.sql`AND pe.saleRewardId = ${saleRewardId}` : Prisma.sql``}
      ${
        search
          ? Prisma.sql`AND (
        LOWER(p.name) LIKE LOWER(${`%${search}%`}) 
        OR LOWER(p.email) LIKE LOWER(${`%${search}%`})
        OR EXISTS (
          SELECT 1 FROM Link searchLink 
          WHERE searchLink.programId = ${programId}
          AND searchLink.partnerId = p.id 
          AND searchLink.shortLink LIKE LOWER(${`%${search}%`})
        )
      )`
          : Prisma.sql``
      }
      ${ids && ids.length > 0 ? Prisma.sql`AND pe.partnerId IN (${Prisma.join(ids)})` : Prisma.sql``}
    GROUP BY 
      p.id, pe.id, metrics.totalClicks, metrics.totalLeads, metrics.totalSales, metrics.totalSaleAmount, pe.totalCommissions
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)} ${Prisma.raw(`, ${sortColumnExtraMap[sortBy]} ${sortOrder}`)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

  return partners.map((partner) => {
    return {
      ...partner,
      createdAt: new Date(partner.enrollmentCreatedAt),
      clicks: Number(partner.totalClicks),
      leads: Number(partner.totalLeads),
      sales: Number(partner.totalSales),
      saleAmount: Number(partner.totalSaleAmount),
      totalCommissions: Number(partner.totalCommissions),
      netRevenue: Number(partner.netRevenue),
      links: partner.links.filter((link: any) => link !== null),
    };
  });
}
