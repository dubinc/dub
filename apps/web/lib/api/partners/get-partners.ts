import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const sortColumnsMap = {
  createdAt: "pe.createdAt",
  clicks: "totalClicks",
  leads: "totalLeads",
  conversions: "totalConversions",
  sales: "totalSales",
  saleAmount: "totalSaleAmount",
  commissions: "totalCommissions",
  netRevenue: "netRevenue",
};

// secondary sort column
const sortColumnExtraMap = {
  createdAt: "totalClicks",
  clicks: "totalLeads",
  leads: "totalConversions",
  conversions: "totalSaleAmount",
  sales: "totalClicks",
  saleAmount: "totalClicks",
  commissions: "totalSaleAmount",
  netRevenue: "totalSaleAmount",
};

type PartnerFilters = z.infer<typeof getPartnersQuerySchemaExtended> & {
  programId: string;
};

export async function getPartners(filters: PartnerFilters) {
  const {
    status,
    country,
    search,
    tenantId,
    partnerIds,
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includeExpandedFields,
    groupId,
  } = filters;

  const partners = (await prisma.$queryRaw`
    SELECT 
      p.*, 
      pe.id as enrollmentId, 
      pe.status, 
      pe.programId, 
      pe.partnerId, 
      pe.tenantId,
      pe.groupId,
      pe.applicationId,
      pe.createdAt as enrollmentCreatedAt,
      pe.bannedAt,
      pe.bannedReason,
      pe.clickRewardId,
      pe.leadRewardId,
      pe.saleRewardId,
      pe.discountId,
      ${
        includeExpandedFields
          ? Prisma.sql`
      COALESCE(metrics.totalClicks, 0) as totalClicks,
      COALESCE(metrics.totalLeads, 0) as totalLeads,
      COALESCE(metrics.totalConversions, 0) as totalConversions,
      COALESCE(metrics.totalSales, 0) as totalSales,
      COALESCE(metrics.totalSaleAmount, 0) as totalSaleAmount,
      COALESCE(pe.totalCommissions, 0) as totalCommissions,
      COALESCE(metrics.totalSaleAmount, 0) - COALESCE(pe.totalCommissions, 0) as netRevenue,
      `
          : Prisma.sql`
      0 as totalClicks,
      0 as totalLeads,
      0 as totalConversions,
      0 as totalSales,
      0 as totalSaleAmount,
      0 as totalCommissions,
      0 as netRevenue,
      `
      }
      COALESCE(
        JSON_ARRAYAGG(
          IF(l.id IS NOT NULL,
            JSON_OBJECT(
              'id', l.id,
              'domain', l.domain,
              'key', l.\`key\`,
              'shortLink', l.shortLink,
              'couponCode', l.couponCode,
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
      ) as links
    FROM 
      ProgramEnrollment pe 
    INNER JOIN 
      Partner p ON p.id = pe.partnerId 
    LEFT JOIN Link l ON l.programId = pe.programId 
      AND l.partnerId = pe.partnerId
    ${
      includeExpandedFields
        ? Prisma.sql`
    LEFT JOIN (
      SELECT 
        partnerId,
        SUM(clicks) as totalClicks,
        SUM(leads) as totalLeads,
        SUM(conversions) as totalConversions,
        SUM(sales) as totalSales,
        SUM(saleAmount) as totalSaleAmount
      FROM Link
      WHERE programId = ${programId}
        AND partnerId IS NOT NULL
        AND clicks > 0
      GROUP BY partnerId
    ) metrics ON metrics.partnerId = pe.partnerId
    `
        : Prisma.sql``
    }
    WHERE 
      pe.programId = ${programId}
      ${status ? Prisma.sql`AND pe.status = ${status}` : Prisma.sql`AND pe.status IN ('approved', 'invited')`}
      ${tenantId ? Prisma.sql`AND pe.tenantId = ${tenantId}` : Prisma.sql``}
      ${country ? Prisma.sql`AND p.country = ${country}` : Prisma.sql``}
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
      ${partnerIds && partnerIds.length > 0 ? Prisma.sql`AND pe.partnerId IN (${Prisma.join(partnerIds)})` : Prisma.sql``}
      ${groupId ? Prisma.sql`AND pe.groupId = ${groupId}` : Prisma.sql``}
    GROUP BY 
      p.id, pe.id${includeExpandedFields ? Prisma.sql`, metrics.totalClicks, metrics.totalLeads, metrics.totalConversions, metrics.totalSales, metrics.totalSaleAmount, pe.totalCommissions` : Prisma.sql``}
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)} ${Prisma.raw(`, ${sortColumnExtraMap[sortBy]} ${sortOrder}`)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

  return partners.map((partner) => ({
    ...partner,
    createdAt: new Date(partner.enrollmentCreatedAt),
    clicks: Number(partner.totalClicks),
    leads: Number(partner.totalLeads),
    conversions: Number(partner.totalConversions),
    sales: Number(partner.totalSales),
    saleAmount: Number(partner.totalSaleAmount),
    totalCommissions: Number(partner.totalCommissions),
    netRevenue: Number(partner.netRevenue),
    links: partner.links.filter((link: any) => link !== null),
  }));
}
