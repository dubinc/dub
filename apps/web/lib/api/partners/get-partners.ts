import { prisma } from "@/lib/prisma";
import { toCentsNumber } from "@dub/utils";
import { buildProgramEnrollmentWhereForList } from "./program-enrollment-query";
import {
  buildPartnerSearchQuery,
  getPartnerSearchProvider,
  orderByPartnerSearchHits,
  PartnerSearchProvider,
  PartnerSearchQueryInput,
} from "./search";

type PartnerFilters = PartnerSearchQueryInput & {
  includeGroup?: boolean;
};

interface GetPartnersOptions {
  searchProvider?: PartnerSearchProvider | null;
}

export async function getPartners(
  filters: PartnerFilters,
  { searchProvider = getPartnerSearchProvider() }: GetPartnersOptions = {},
) {
  const {
    page = 1,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includePartnerPlatforms: _includePartnerPlatforms,
    includeGroup = false,
    ...enrollmentRest
  } = filters;

  const searchQuery = searchProvider ? buildPartnerSearchQuery(filters) : null;
  const searchResult =
    searchProvider && searchQuery
      ? await searchProvider.search(searchQuery)
      : null;

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: searchResult
      ? {
          programId,
          id: { in: searchResult.hits.map(({ id }) => id) },
        }
      : buildProgramEnrollmentWhereForList({
          ...enrollmentRest,
          programId,
        }),
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
      ...(includeGroup
        ? {
            partnerGroup: {
              select: {
                name: true,
              },
            },
          }
        : {}),
    },
    ...(searchResult
      ? {}
      : {
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
  });

  const partners = searchResult
    ? orderByPartnerSearchHits(programEnrollments, searchResult.hits)
    : programEnrollments;

  return partners.map(
    ({ partner, links, partnerGroup, ...programEnrollment }) => ({
      ...partner,
      ...programEnrollment,
      id: partner.id,
      createdAt: new Date(programEnrollment.createdAt),
      ...(includeGroup && { group: partnerGroup }),
      tags: partner.programPartnerTags
        .map(({ partnerTag }) => partnerTag)
        .filter((t) => t.programId != null && t.programId === programId),
      links,
      netRevenue:
        toCentsNumber(programEnrollment.totalSaleAmount ?? 0) -
        toCentsNumber(programEnrollment.totalCommissions ?? 0),
    }),
  );
}
