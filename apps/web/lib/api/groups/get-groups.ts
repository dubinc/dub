import { getGroupsQuerySchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type GroupFilters = z.infer<typeof getGroupsQuerySchema> & {
  programId: string;
};

const sortColumnsMap = {
  createdAt: "pg.createdAt",
  partners: "partners",
  totalClicks: "totalClicks",
  totalLeads: "totalLeads",
  totalConversions: "totalConversions",
  totalSales: "totalSales",
  totalSaleAmount: "totalSaleAmount",
  totalCommissions: "totalCommissions",
  netRevenue: "netRevenue",
};

export async function getGroups(filters: GroupFilters) {
  const {
    search,
    groupIds,
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includeExpandedFields,
  } = filters;

  console.time("getGroups");

  const groups = (await prisma.$queryRaw`
    SELECT
      pg.id,
      pg.programId,
      pg.name,
      pg.slug,
      pg.color,
      pg.additionalLinks,
      pg.maxPartnerLinks,
      pg.linkStructure,
      ${
        includeExpandedFields
          ? Prisma.sql`
        COUNT(DISTINCT pe.partnerId) as partners,
        COALESCE(SUM(metrics.totalClicks), 0) as totalClicks,
        COALESCE(SUM(metrics.totalLeads), 0) as totalLeads,
        COALESCE(SUM(metrics.totalSales), 0) as totalSales,
        COALESCE(SUM(metrics.totalSaleAmount), 0) as totalSaleAmount,
        COALESCE(SUM(metrics.totalConversions), 0) as totalConversions,
        COALESCE(SUM(pe.totalCommissions), 0) as totalCommissions,
        COALESCE(SUM(metrics.totalSaleAmount), 0) - COALESCE(SUM(pe.totalCommissions), 0) as netRevenue
        `
          : Prisma.sql`
        0 as partners,
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
    LEFT JOIN ProgramEnrollment pe ON pe.groupId = pg.id AND pe.status IN ('approved', 'invited')
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
    ${groupIds && groupIds.length > 0 ? Prisma.sql`AND pg.id IN (${Prisma.join(groupIds)})` : Prisma.sql``}
    GROUP BY pg.id
    ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `) satisfies Array<any>;

  console.timeEnd("getGroups");

  return groups.map((group) => ({
    ...group,
    partners: Number(group.partners),
    totalClicks: Number(group.totalClicks),
    totalLeads: Number(group.totalLeads),
    totalSales: Number(group.totalSales),
    totalSaleAmount: Number(group.totalSaleAmount),
    totalConversions: Number(group.totalConversions),
    totalCommissions: Number(group.totalCommissions),
    netRevenue: Number(group.netRevenue),
  }));
}
