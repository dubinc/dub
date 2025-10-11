import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type PartnerFilters = z.infer<typeof getPartnersQuerySchemaExtended> & {
  programId: string;
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
      status,
      tenantId,
      groupId,
      ...(country || search || email || partnerIds
        ? {
            partner: {
              ...(partnerIds && {
                id: {
                  in: partnerIds,
                },
              }),
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
    orderBy: {
      [sortBy]: sortOrder,
    },
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
