import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type PartnerFilters = z.infer<typeof getPartnersQuerySchemaExtended> & {
  programId: string;
};

// secondary sort column
const secondarySortColumnMap = {
  createdAt: "totalClicks",
  totalClicks: "totalLeads",
  totalLeads: "totalConversions",
  totalConversions: "totalSaleAmount",
  totalSales: "totalSaleAmount",
  totalSaleAmount: "totalLeads",
  totalCommissions: "totalSaleAmount",
  netRevenue: "totalSaleAmount",
};

export async function getPartners(filters: PartnerFilters) {
  const {
    status,
    country,
    search,
    email,
    tenantId,
    partnerIds,
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    groupId,
  } = filters;

  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      ...(partnerIds && {
        partnerId: {
          in: partnerIds,
        },
      }),
      tenantId,
      status,
      groupId,
      ...(country || search || email
        ? {
            partner: {
              country,
              ...(search && {
                OR: [
                  { id: { contains: search } },
                  { name: { contains: search } },
                  { email: { contains: search } },
                ],
              }),
              email,
            },
          }
        : {}),
    },
    include: {
      partner: true,
      links: true,
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: [
      {
        [sortBy]: sortOrder,
      },
      {
        [secondarySortColumnMap[sortBy]]: "desc",
      },
    ],
  });

  return partners.map(({ partner, links, ...programEnrollment }) => ({
    ...partner,
    ...programEnrollment,
    id: partner.id,
    createdAt: new Date(programEnrollment.createdAt),
    links,
    netRevenue:
      programEnrollment.totalSaleAmount - programEnrollment.totalCommissions,
  }));
}
