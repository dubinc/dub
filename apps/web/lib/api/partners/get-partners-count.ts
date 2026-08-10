import { prisma } from "@/lib/prisma";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { Prisma, ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";
import {
  buildMetricRangeWhere,
  buildNullableStringListWhere,
  buildPartnerEmailSearchWhere,
  buildProgramEnrollmentWhereForList,
  mergePartnerCountryAndSearchWhere,
} from "./program-enrollment-query";
import {
  buildPartnerSearchCandidateQuery,
  getPartnerSearchProvider,
  PartnerSearchProvider,
} from "./search";

type PartnersCountFilters = z.infer<typeof partnersCountQuerySchema> & {
  programId: string;
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

export async function getPartnersCount<T>(
  filters: PartnersCountFilters,
  {
    searchProvider = getPartnerSearchProvider(),
  }: { searchProvider?: PartnerSearchProvider | null } = {},
): Promise<T> {
  const { groupBy, programId, ...enrollmentFilters } = filters;
  const candidateQuery = searchProvider
    ? buildPartnerSearchCandidateQuery({ ...enrollmentFilters, programId })
    : null;
  const candidateResult =
    searchProvider && candidateQuery
      ? await searchProvider.searchCandidates(candidateQuery)
      : null;
  const candidateIds = candidateResult?.hits.map(({ id }) => id);
  const enrollmentBase = {
    ...enrollmentFilters,
    programId,
    ...(candidateResult ? { search: undefined } : {}),
  };

  // Read from `enrollmentBase` so the grouping paths below see the same
  // cleared `search` as `buildProgramEnrollmentWhereForList`. Destructuring
  // `enrollmentFilters` here would AND the database full-text predicate on top
  // of the relevance candidates, which drops every match the database cannot
  // find on its own (e.g. partial emails, links, platforms, descriptions).
  const {
    status,
    country,
    search,
    email,
    partnerIds,
    groupId,
    partnerTagId,
    tenantId,
    partnerTagIdOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
  } = enrollmentBase;

  const enrollmentScope: Prisma.ProgramEnrollmentWhereInput = {
    programId,
    ...(tenantId ? { tenantId } : {}),
    ...(candidateIds ? { id: { in: candidateIds } } : {}),
  };

  const partnerTagIdNotIn = partnerTagIdOperator === "NOT IN";
  const groupIdNotIn = groupIdOperator === "NOT IN";
  const countryNotIn = countryOperator === "NOT IN";

  const groupIdWhere = buildNullableStringListWhere(
    "groupId",
    groupId,
    groupIdNotIn,
  );
  const countryWhere = buildNullableStringListWhere(
    "country",
    country,
    countryNotIn,
  );

  const emailSearchWhere = buildPartnerEmailSearchWhere({ email, search });
  const partnerTagFilter = partnerTagId
    ? {
        programPartnerTags: {
          ...(partnerTagIdNotIn
            ? {
                none: {
                  programId,
                  partnerTagId: { in: partnerTagId },
                },
              }
            : {
                some: {
                  programId,
                  partnerTagId: { in: partnerTagId },
                },
              }),
        },
      }
    : undefined;

  const commonWhere: Prisma.PartnerWhereInput = {
    ...emailSearchWhere,
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
    ...(partnerTagFilter ?? {}),
  };

  const partnerWhereWithCountry: Prisma.PartnerWhereInput = {
    ...mergePartnerCountryAndSearchWhere(countryWhere, emailSearchWhere),
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
    ...(partnerTagFilter ?? {}),
  };

  const enrollmentMetricWhere = buildMetricRangeWhere(enrollmentBase);

  if (groupBy === "country") {
    const partners = await prisma.partner.groupBy({
      by: ["country"],
      where: {
        programs: {
          some: {
            ...enrollmentScope,
            ...(groupIdWhere ?? {}),
            status,
            ...enrollmentMetricWhere,
          },
        },
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
    });

    return partners as T;
  }

  if (groupBy === "status") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["status"],
      where: {
        ...enrollmentScope,
        ...(groupIdWhere ?? {}),
        partner: partnerWhereWithCountry,
        ...enrollmentMetricWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          status: "desc",
        },
      },
    });

    // Find missing statuses
    const missingStatuses = Object.values(ProgramEnrollmentStatus).filter(
      (status) => !partners.some((p) => p.status === status),
    );

    // Add missing statuses with count 0
    missingStatuses.forEach((status) => {
      partners.push({ _count: 0, status: status });
    });

    return partners as T;
  }

  if (groupBy === "groupId") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["groupId"],
      where: {
        ...enrollmentScope,
        partner: partnerWhereWithCountry,
        status,
        ...enrollmentMetricWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          groupId: "desc",
        },
      },
    });

    return partners as T;
  }

  if (groupBy === "partnerTagId") {
    const enrollmentWhere: Prisma.ProgramEnrollmentWhereInput = {
      ...buildProgramEnrollmentWhereForList({
        ...enrollmentBase,
        partnerTagId: undefined,
      }),
      ...(candidateIds ? { id: { in: candidateIds } } : {}),
    };

    const partners = await prisma.programPartnerTag.groupBy({
      by: ["partnerTagId"],
      where: {
        programId,
        programEnrollment: enrollmentWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          partnerTagId: "desc",
        },
      },
    });

    return partners as T;
  }

  if (groupBy === "referredByPartnerId") {
    const results = await prisma.programApplicationEvent.groupBy({
      by: ["referredByPartnerId"],
      where: {
        programId,
        referredByPartnerId: {
          not: null,
        },
        programEnrollment: {
          ...enrollmentScope,
          ...(groupIdWhere ?? {}),
          status,
          partner: partnerWhereWithCountry,
          ...enrollmentMetricWhere,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          referredByPartnerId: "desc",
        },
      },
    });

    return results.map((row) => ({
      referredByPartnerId: row.referredByPartnerId,
      _count: row._count,
    })) as T;
  }

  // Get absolute count of partners
  const count = await prisma.programEnrollment.count({
    where: {
      ...buildProgramEnrollmentWhereForList(enrollmentBase),
      ...(candidateIds ? { id: { in: candidateIds } } : {}),
    },
  });

  return count as T;
}
