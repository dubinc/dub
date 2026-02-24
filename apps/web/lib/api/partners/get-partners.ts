import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import * as z from "zod/v4";

type PartnerFilters = z.infer<typeof getPartnersQuerySchemaExtended> & {
  programId: string;
  partnerTagIdsOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
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
    partnerTagIds,
    partnerTagIdsOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
  } = filters;

  const partnerTagIdsNotIn = partnerTagIdsOperator === "NOT IN";

  const partners = await prisma.programEnrollment.findMany({
    where: {
      tenantId,
      programId,
      ...(partnerIds && {
        partnerId: {
          in: partnerIds,
        },
      }),
      ...((partnerTagIds || country || search || email) && {
        partner: {
          ...(partnerTagIds && {
            programPartnerTags: {
              ...(partnerTagIdsNotIn
                ? {
                    none: {
                      programId,
                      partnerTagId: { in: partnerTagIds },
                    },
                  }
                : {
                    some: {
                      programId,
                      partnerTagId: { in: partnerTagIds },
                    },
                  }),
            },
          }),
          ...(country && {
            country:
              countryOperator === "NOT IN"
                ? { not: country }
                : country,
          }),
          ...(email
            ? { email }
            : search
              ? search.includes("@")
                ? { email: search }
                : {
                    email: { search: sanitizeFullTextSearch(search) },
                    name: { search: sanitizeFullTextSearch(search) },
                    companyName: { search: sanitizeFullTextSearch(search) },
                  }
              : {}),
        },
      }),
      status,
      ...(groupId && {
        groupId:
          groupIdOperator === "NOT IN"
            ? { not: groupId }
            : groupId,
      }),
    },
    include: {
      partner: {
        include: {
          programPartnerTags: {
            where: {
              programId,
            },
            include: {
              partnerTag: true,
            },
          },
          platforms: true,
        },
      },
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
    tags: partner.programPartnerTags.map(({ partnerTag }) => partnerTag),
    links,
    netRevenue:
      programEnrollment.totalSaleAmount - programEnrollment.totalCommissions,
  }));
}
