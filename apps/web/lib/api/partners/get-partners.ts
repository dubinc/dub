import { prisma } from "@/lib/prisma";
import { toCentsNumber } from "@dub/utils";
import { buildProgramEnrollmentWhereForList } from "./program-enrollment-query";
import {
  buildPartnerSearchCandidateQuery,
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

  const candidateQuery = searchProvider
    ? buildPartnerSearchCandidateQuery(filters)
    : null;
  const candidateResult =
    searchProvider && candidateQuery
      ? await searchProvider.searchCandidates(candidateQuery)
      : null;
  const databaseSortBy = sortBy === "relevance" ? "totalSaleAmount" : sortBy;
  const relevanceHits =
    candidateResult && sortBy === "relevance" ? candidateResult.hits : null;
  const enrollmentWhere = buildProgramEnrollmentWhereForList({
    ...enrollmentRest,
    programId,
    ...(candidateResult ? { search: undefined } : {}),
  });

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      ...enrollmentWhere,
      ...(candidateResult
        ? { id: { in: candidateResult.hits.map(({ id }) => id) } }
        : {}),
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
    ...(relevanceHits === null
      ? {
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: {
            [databaseSortBy]: sortOrder,
          },
        }
      : {}),
  });

  const partners = relevanceHits
    ? orderByPartnerSearchHits(programEnrollments, relevanceHits).slice(
        (page - 1) * pageSize,
        page * pageSize,
      )
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
