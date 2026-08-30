import { sanitizeFullTextSearch } from "@/lib/prisma";
import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";

/**
 * A complete address, not merely something containing "@". `steven@` is what a
 * half-typed query looks like, and treating that as an exact lookup returns
 * nothing instead of the partial matches the caller wanted.
 *
 * `@dub.co` fails this on purpose: it is a domain search, which the email index
 * cannot serve (a trailing-wildcard match), so it belongs on the search path.
 */
export function isExactEmailQuery(query: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(query);
}

/**
 * A pasted partner ID, not a prefix of one. IDs are 24 or 25 characters after
 * `pn_`, so a shorter suffix is someone typing, and matching it exactly would return nothing.
 */
export function isExactPartnerIdQuery(query: string): boolean {
  return /^pn_[a-z0-9]{24,}$/iu.test(query);
}

/**
 * Email / search filters on `Partner` (exact email, exact partner ID, or full-text on email/name/company).
 */
export function buildPartnerEmailSearchWhere({
  email,
  search: rawSearch,
}: {
  email?: string | null;
  search?: string | null;
}): Prisma.PartnerWhereInput {
  const search = rawSearch?.trim();

  if (email) {
    return { email };
  }
  if (search) {
    if (isExactEmailQuery(search)) {
      return { email: search };
    }
    if (isExactPartnerIdQuery(search)) {
      return { id: search };
    }
    const q = sanitizeFullTextSearch(search);
    return {
      OR: [
        { email: { search: q } },
        { name: { search: q } },
        { companyName: { search: q } },
      ],
    };
  }
  return {};
}

export type PartnerEnrollmentQueryFilters = Omit<
  z.infer<typeof getPartnersQuerySchemaExtended>,
  "sortBy" | "sortOrder" | "page" | "pageSize" | "includePartnerPlatforms"
> & {
  programId: string;
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

function normalizeBounds(
  min?: number | null,
  max?: number | null,
): { min?: number; max?: number } {
  if (min == null && max == null) {
    return {};
  }
  if (min != null && max != null && min > max) {
    return { min: max, max: min };
  }
  return { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) };
}

/** Metric range filters for program enrollment list/count queries. */
export function buildMetricRangeWhere(
  filters: PartnerEnrollmentQueryFilters,
): Prisma.ProgramEnrollmentWhereInput {
  const and: Prisma.ProgramEnrollmentWhereInput[] = [];

  {
    const b = normalizeBounds(filters.totalClicksMin, filters.totalClicksMax);
    if (b.min != null || b.max != null) {
      and.push({
        totalClicks: {
          ...(b.min != null && { gte: b.min }),
          ...(b.max != null && { lte: b.max }),
        },
      });
    }
  }

  {
    const b = normalizeBounds(filters.totalLeadsMin, filters.totalLeadsMax);
    if (b.min != null || b.max != null) {
      and.push({
        totalLeads: {
          ...(b.min != null && { gte: b.min }),
          ...(b.max != null && { lte: b.max }),
        },
      });
    }
  }

  {
    const b = normalizeBounds(
      filters.totalConversionsMin,
      filters.totalConversionsMax,
    );
    if (b.min != null || b.max != null) {
      and.push({
        totalConversions: {
          ...(b.min != null && { gte: b.min }),
          ...(b.max != null && { lte: b.max }),
        },
      });
    }
  }

  {
    const b = normalizeBounds(
      filters.totalSaleAmountMin,
      filters.totalSaleAmountMax,
    );
    if (b.min != null || b.max != null) {
      and.push({
        totalSaleAmount: {
          ...(b.min != null && { gte: b.min }),
          ...(b.max != null && { lte: b.max }),
        },
      });
    }
  }

  {
    const b = normalizeBounds(
      filters.totalCommissionsMin,
      filters.totalCommissionsMax,
    );
    if (b.min != null || b.max != null) {
      and.push({
        totalCommissions: {
          ...(b.min != null && { gte: BigInt(Math.trunc(b.min)) }),
          ...(b.max != null && { lte: BigInt(Math.trunc(b.max)) }),
        },
      });
    }
  }

  return and.length ? { AND: and } : {};
}

function normalizeStringList(
  value: string | string[] | undefined,
): string[] | undefined {
  if (value === undefined) return undefined;
  const list = (Array.isArray(value) ? value : [value]).filter(
    (v) => typeof v === "string" && v.length > 0,
  );
  return list.length === 0 ? undefined : list;
}

/**
 * Nullable string column on `ProgramEnrollment` or `Partner` (`groupId` /
 * `country`). For NOT IN / not, SQL excludes NULL; OR with `null` keeps rows
 * with no value / unknown.
 */
export function buildNullableStringListWhere(
  field: "groupId",
  value: string | string[] | undefined,
  exclude: boolean,
): Prisma.ProgramEnrollmentWhereInput | undefined;
export function buildNullableStringListWhere(
  field: "country",
  value: string | string[] | undefined,
  exclude: boolean,
): Prisma.PartnerWhereInput | undefined;
export function buildNullableStringListWhere(
  field: "groupId" | "country",
  value: string | string[] | undefined,
  exclude: boolean,
): Prisma.ProgramEnrollmentWhereInput | Prisma.PartnerWhereInput | undefined {
  const list = normalizeStringList(value);
  if (list === undefined) return undefined;

  const inOrEquals = list.length === 1 ? list[0]! : { in: list };
  const negation = list.length === 1 ? { not: list[0]! } : { notIn: list };

  if (!exclude) {
    return { [field]: inOrEquals } as
      | Prisma.ProgramEnrollmentWhereInput
      | Prisma.PartnerWhereInput;
  }

  return {
    OR: [{ [field]: null }, { [field]: negation }],
  } as Prisma.ProgramEnrollmentWhereInput | Prisma.PartnerWhereInput;
}

export function mergePartnerCountryAndSearchWhere(
  countryWhere: Prisma.PartnerWhereInput | undefined,
  searchWhere: Prisma.PartnerWhereInput,
): Prisma.PartnerWhereInput {
  const hasCountry = countryWhere && Object.keys(countryWhere).length > 0;
  const hasSearch = Object.keys(searchWhere).length > 0;

  if (hasCountry && hasSearch) {
    return { AND: [countryWhere!, searchWhere] };
  }

  return {
    ...(hasCountry ? countryWhere! : {}),
    ...(hasSearch ? searchWhere : {}),
  };
}

/** Matches GET /api/partners enrollment filter shape + metric ranges. */
export function buildProgramEnrollmentWhereForList(
  filters: PartnerEnrollmentQueryFilters,
): Prisma.ProgramEnrollmentWhereInput {
  const {
    programId,
    status,
    groupId,
    country,
    tenantId,
    partnerIds,
    search,
    email,
    partnerTagId,
    referredByPartnerId,
    partnerTagIdOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
  } = filters;

  const metricWhere = buildMetricRangeWhere(filters);

  const partnerTagIdNotIn = partnerTagIdOperator === "NOT IN";
  const groupIdNotIn = groupIdOperator === "NOT IN";
  const countryNotIn = countryOperator === "NOT IN";

  const searchWhere = buildPartnerEmailSearchWhere({ email, search });

  const countryWhere = buildNullableStringListWhere(
    "country",
    country,
    countryNotIn,
  );

  const partnerWhere: Prisma.PartnerWhereInput = {
    ...(partnerTagId && {
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
    }),
    ...mergePartnerCountryAndSearchWhere(countryWhere, searchWhere),
  };

  const hasPartnerWhere = Object.keys(partnerWhere).length > 0;

  const groupIdWhere = buildNullableStringListWhere(
    "groupId",
    groupId,
    groupIdNotIn,
  );

  return {
    tenantId,
    programId,
    ...(partnerIds && {
      partnerId: {
        in: partnerIds,
      },
    }),
    status,
    ...(groupIdWhere ?? {}),
    ...(hasPartnerWhere ? { partner: partnerWhere } : {}),
    ...(referredByPartnerId && {
      applicationEvent: {
        referredByPartnerId,
      },
    }),
    ...metricWhere,
  };
}
