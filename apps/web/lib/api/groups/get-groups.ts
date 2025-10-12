import { getGroupsQuerySchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type GroupFilters = z.infer<typeof getGroupsQuerySchema> & {
  programId: string;
};

export async function getGroups(filters: GroupFilters) {
  const { search, groupIds, page, pageSize, sortBy, sortOrder, programId } =
    filters;

  const [groups, programEnrollments] = await Promise.all([
    prisma.partnerGroup.findMany({
      where: {
        programId,
        ...(groupIds && {
          id: {
            in: groupIds,
          },
        }),
        ...(search && {
          name: { contains: search },
        }),
      },
    }),
    prisma.programEnrollment.groupBy({
      by: ["groupId"],
      where: {
        programId,
      },
      _count: {
        partnerId: true,
      },
      _sum: {
        totalClicks: true,
        totalLeads: true,
        totalSales: true,
        totalSaleAmount: true,
        totalConversions: true,
        totalCommissions: true,
      },
      orderBy:
        sortBy === "partners"
          ? { _count: { partnerId: sortOrder } }
          : {
              _sum: {
                [sortBy]: sortOrder,
              },
            },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);

  const finalGroups = programEnrollments
    .map((programEnrollment) => {
      const { groupId, _sum, _count } = programEnrollment;
      const group = groups.find((group) => group.id === groupId);
      if (!group) return null;
      return {
        ...group,
        totalPartners: Number(_count.partnerId),
        totalClicks: Number(_sum.totalClicks),
        totalLeads: Number(_sum.totalLeads),
        totalSales: Number(_sum.totalSales),
        totalSaleAmount: Number(_sum.totalSaleAmount),
        totalConversions: Number(_sum.totalConversions),
        totalCommissions: Number(_sum.totalCommissions),
        netRevenue:
          Number(_sum.totalSaleAmount) - Number(_sum.totalCommissions),
      };
    })
    .filter((group) => group !== null);

  return finalGroups;
}
