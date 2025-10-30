import { getGroupsQuerySchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type GroupFilters = z.infer<typeof getGroupsQuerySchema> & {
  programId: string;
};

// secondary sort column
const secondarySortColumnMap = {
  createdAt: "totalClicks",
  totalPartners: "totalSaleAmount",
  totalClicks: "totalLeads",
  totalLeads: "totalConversions",
  totalConversions: "totalSaleAmount",
  totalSales: "totalSaleAmount",
  totalSaleAmount: "totalLeads",
  totalCommissions: "totalSaleAmount",
  netRevenue: "totalSaleAmount",
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

  // First get the basic group data with metrics
  const groups = (await prisma.$queryRaw`
    SELECT
      pg.id,
      pg.programId,
      pg.name,
      pg.slug,
      pg.color,
      pg.clickRewardId,
      pg.leadRewardId,
      pg.saleRewardId,
      pg.discountId,
      pg.additionalLinks,
      pg.maxPartnerLinks,
      pg.linkStructure,
      pg.applicationFormData,
      pg.applicationFormPublishedAt,
      pg.landerData,
      pg.landerPublishedAt,
      pg.utmTemplateId,
      pg.createdAt,
      pg.updatedAt,
      ${
        includeExpandedFields
          ? Prisma.sql`
        COUNT(DISTINCT pe.partnerId) as totalPartners,
        COALESCE(SUM(pe.totalClicks), 0) as totalClicks,
        COALESCE(SUM(pe.totalLeads), 0) as totalLeads,
        COALESCE(SUM(pe.totalSales), 0) as totalSales,
        COALESCE(SUM(pe.totalSaleAmount), 0) as totalSaleAmount,
        COALESCE(SUM(pe.totalConversions), 0) as totalConversions,
        COALESCE(SUM(pe.totalCommissions), 0) as totalCommissions,
        COALESCE(SUM(pe.totalSaleAmount), 0) - COALESCE(SUM(pe.totalCommissions), 0) as netRevenue
        `
          : Prisma.sql`
        0 as totalPartners,
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
    ${includeExpandedFields ? Prisma.sql`LEFT JOIN ProgramEnrollment pe ON pe.groupId = pg.id AND pe.status = 'approved'` : Prisma.sql``}
    WHERE pg.programId = ${programId}
    ${search ? Prisma.sql`AND (pg.name LIKE ${`%${search}%`} OR pg.slug LIKE ${`%${search}%`})` : Prisma.sql``}
    ${groupIds && groupIds.length > 0 ? Prisma.sql`AND pg.id IN (${Prisma.join(groupIds)})` : Prisma.sql``}
    GROUP BY pg.id
    ORDER BY ${Prisma.raw(sortBy === "createdAt" ? "pg.createdAt" : sortBy)} ${Prisma.raw(sortOrder)}, ${Prisma.raw(secondarySortColumnMap[sortBy])} ${Prisma.raw(sortOrder)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `) satisfies Array<any>;

  // Get group IDs for fetching rewards
  const groupIdsFromQuery = groups.map((group) => group.id);

  // Fetch rewards for these groups
  const groupsWithRewards = await prisma.partnerGroup.findMany({
    where: {
      id: {
        in: groupIdsFromQuery,
      },
    },
    include: {
      clickReward: true,
      leadReward: true,
      saleReward: true,
      discount: true,
    },
  });

  // Create a map for quick lookup
  const rewardsMap = new Map(
    groupsWithRewards.map((group) => [
      group.id,
      {
        clickReward: group.clickReward,
        leadReward: group.leadReward,
        saleReward: group.saleReward,
        discount: group.discount,
      },
    ]),
  );

  return groups.map((group) => ({
    ...group,
    totalPartners: Number(group.totalPartners),
    totalClicks: Number(group.totalClicks),
    totalLeads: Number(group.totalLeads),
    totalSales: Number(group.totalSales),
    totalSaleAmount: Number(group.totalSaleAmount),
    totalConversions: Number(group.totalConversions),
    totalCommissions: Number(group.totalCommissions),
    netRevenue: Number(group.netRevenue),
    // Add reward data
    ...rewardsMap.get(group.id),
  }));
}
