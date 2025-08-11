import { getGroupsQuerySchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type GroupFilters = z.infer<typeof getGroupsQuerySchema> & {
  programId: string;
};

const sortColumnsMap = {
  createdAt: "pg.createdAt",
  clicks: "totalClicks",
  leads: "totalLeads",
  conversions: "totalConversions",
  sales: "totalSales",
  saleAmount: "totalSaleAmount",
  commissions: "totalCommissions",
  netRevenue: "netRevenue",
};

export async function getGroups(filters: GroupFilters) {
  const {
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includeExpandedFields,
  } = filters;

  const groups = (await prisma.$queryRaw`
    SELECT
      pg.id,
      pg.programId,
      pg.name,
      pg.slug,
      pg.color,
      ${
        includeExpandedFields
          ? Prisma.sql`
        COALESCE(SUM(metrics.totalClicks), 0) as totalClicks,
        COALESCE(SUM(metrics.totalLeads), 0) as totalLeads,
        COALESCE(SUM(metrics.totalSales), 0) as totalSales,
        COALESCE(SUM(metrics.totalSaleAmount), 0) as totalSaleAmount,
        COALESCE(SUM(metrics.totalConversions), 0) as totalConversions,
        COALESCE(SUM(pe.totalCommissions), 0) as totalCommissions,
        COALESCE(SUM(metrics.totalSaleAmount), 0) - COALESCE(SUM(pe.totalCommissions), 0) as netRevenue
        `
          : Prisma.sql`
        0 as totalClicks,
        0 as totalLeads,
        0 as totalSales,
        0 as totalSaleAmount,
        0 as totalConversions,
        0 as totalCommissions,
        0 as netRevenue
        `
      }
    FROM PartnerGroup pg
    LEFT JOIN ProgramEnrollment pe ON pe.groupId = pg.id
    ${
      includeExpandedFields
        ? Prisma.sql`
          LEFT JOIN (
            SELECT 
              partnerId,
              SUM(clicks) as totalClicks,
              SUM(leads) as totalLeads,
              SUM(sales) as totalSales,
              SUM(saleAmount) as totalSaleAmount,
              SUM(conversions) as totalConversions
            FROM Link
            WHERE programId = ${programId}
              AND partnerId IS NOT NULL
              AND clicks > 0
            GROUP BY partnerId
          ) metrics ON metrics.partnerId = pe.partnerId
          `
        : Prisma.sql``
    }
    WHERE pg.programId = ${programId}
    ${search ? Prisma.sql`AND (pg.name LIKE ${`%${search}%`} OR pg.slug LIKE ${`%${search}%`})` : Prisma.sql``}
    GROUP BY pg.id
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `) satisfies Array<any>;

  return groups.map((group) => ({
    ...group,
    clicks: Number(group.totalClicks),
    leads: Number(group.totalLeads),
    sales: Number(group.totalSales),
    saleAmount: Number(group.totalSaleAmount),
    conversions: Number(group.totalConversions),
    commissions: Number(group.totalCommissions),
    netRevenue: Number(group.netRevenue),
  }));
}
