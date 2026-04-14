import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import * as z from "zod/v4";

/**
 * Email / search filters on `Partner` (exact email, or full-text on email/name/company).
 */
export function buildPartnerEmailSearchWhere({
  email,
  search,
}: {
  email?: string | null;
  search?: string | null;
}): Prisma.PartnerWhereInput {
  if (email) {
    return { email };
  }
  if (search) {
    if (search.includes("@")) {
      return { email: search };
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
    partnerTagIdOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
  } = filters;

  const metricWhere = buildMetricRangeWhere(filters);

  const partnerTagIdNotIn = partnerTagIdOperator === "NOT IN";
  const groupIdNotIn = groupIdOperator === "NOT IN";
  const countryNotIn = countryOperator === "NOT IN";

  const searchWhere = buildPartnerEmailSearchWhere({ email, search });

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
    ...(country && {
      country: countryNotIn ? { not: country } : country,
    }),
    ...searchWhere,
  };

  const hasPartnerWhere = Object.keys(partnerWhere).length > 0;

  return {
    tenantId,
    programId,
    ...(partnerIds && {
      partnerId: {
        in: partnerIds,
      },
    }),
    status:
      status === "approved_invited"
        ? {
            in: ["approved", "invited"],
          }
        : status,
    ...(groupId && {
      groupId: groupIdNotIn ? { not: groupId } : groupId,
    }),
    ...(hasPartnerWhere ? { partner: partnerWhere } : {}),
    ...metricWhere,
  };
}
