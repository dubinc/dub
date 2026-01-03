import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import * as z from "zod/v4";

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
      tenantId,
      programId,
      ...(partnerIds && {
        partnerId: {
          in: partnerIds,
        },
      }),
      status,
      groupId,
      ...(country || search || email
        ? {
            partner: {
              country,
              ...(email
                ? { email }
                : search
                  ? search.includes("@")
                    ? { email: search }
                    : {
                        email: { search: sanitizeFullTextSearch(search) },
                        name: { search: sanitizeFullTextSearch(search) },
                      }
                  : {}),
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
