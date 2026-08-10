import { prisma } from "@/lib/prisma";
import { toCentsNumber } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { buildProgramEnrollmentWhereForList } from "./program-enrollment-query";
import {
  buildPartnerSearchCandidateQuery,
  findPartnerSearchCandidates,
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
  throwOnSearchError?: boolean;
}

export async function getPartners(
  filters: PartnerFilters,
  {
    searchProvider = getPartnerSearchProvider(),
    throwOnSearchError = false,
  }: GetPartnersOptions = {},
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
      ? await findPartnerSearchCandidates(searchProvider, candidateQuery, {
          throwOnError: throwOnSearchError,
        })
      : null;
  const databaseSortBy = sortBy === "relevance" ? "totalSaleAmount" : sortBy;
  const relevanceHits =
    candidateResult && sortBy === "relevance" ? candidateResult.hits : null;
  const enrollmentWhere = buildProgramEnrollmentWhereForList({
    ...enrollmentRest,
    programId,
    ...(candidateResult ? { search: undefined } : {}),
  });

  // The candidate IDs already carry the provider's ranking, but the database
  // still has to apply every other filter, so they narrow the query rather than
  // define the result. See PARTNER_SEARCH_CANDIDATE_LIMIT for what that costs.
  const candidateWhere: Prisma.ProgramEnrollmentWhereInput = {
    ...enrollmentWhere,
    ...(candidateResult
      ? { id: { in: candidateResult.hits.map(({ id }) => id) } }
      : {}),
  };

  const include = {
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
  } satisfies Prisma.ProgramEnrollmentInclude;

  let partners: Prisma.ProgramEnrollmentGetPayload<{
    include: typeof include;
  }>[];

  if (relevanceHits) {
    // Relevance order cannot be expressed in SQL, so the page has to be chosen
    // in memory. Resolve which candidates survive the filters as bare IDs
    // first — hydrating all of them to show one page costs ~330ms at the
    // candidate limit against ~4ms for the page alone.
    const matches = await prisma.programEnrollment.findMany({
      where: candidateWhere,
      select: { id: true },
    });

    const pageIds = orderByPartnerSearchHits(matches, relevanceHits)
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ id }) => id);

    const pageEnrollments =
      pageIds.length > 0
        ? await prisma.programEnrollment.findMany({
            where: { id: { in: pageIds } },
            include,
          })
        : [];

    partners = orderByPartnerSearchHits(pageEnrollments, relevanceHits);
  } else {
    partners = await prisma.programEnrollment.findMany({
      where: candidateWhere,
      include,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: {
        [databaseSortBy]: sortOrder,
      },
    });
  }

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
