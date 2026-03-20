import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import * as z from "zod/v4";

/** Fields that constrain the program enrollment `where` (excludes pagination/sort/include flags). */
export type PartnerEnrollmentQueryFilters = Omit<
  z.infer<typeof getPartnersQuerySchemaExtended>,
  "sortBy" | "sortOrder" | "page" | "pageSize" | "includePartnerPlatforms"
> & { programId: string };

export type PartnerMetricPercentileField =
  | "totalClicks"
  | "totalLeads"
  | "totalConversions"
  | "totalCommissions";

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

/** Metric range filters; pass `omitMetric` to exclude one field (percentile cohort for that metric). */
export function buildMetricRangeWhere(
  filters: PartnerEnrollmentQueryFilters,
  options?: { omitMetric?: PartnerMetricPercentileField },
): Prisma.ProgramEnrollmentWhereInput {
  const omit = options?.omitMetric;
  const and: Prisma.ProgramEnrollmentWhereInput[] = [];

  if (omit !== "totalClicks") {
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

  if (omit !== "totalLeads") {
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

  if (omit !== "totalConversions") {
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

  if (omit !== "totalCommissions") {
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
  options?: { percentileMetric?: PartnerMetricPercentileField },
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
  } = filters;

  const metricWhere = buildMetricRangeWhere(filters, {
    omitMetric: options?.percentileMetric,
  });

  return {
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
                      companyName: { search: sanitizeFullTextSearch(search) },
                    }
                : {}),
          },
        }
      : {}),
    ...metricWhere,
  };
}

export function percentileBreakpoints(sorted: number[]): {
  p0: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
} {
  if (sorted.length === 0) {
    return { p0: 0, p25: 0, p50: 0, p75: 0, p100: 0 };
  }
  const pick = (p: number) => {
    const idx = Math.min(
      sorted.length - 1,
      Math.max(0, Math.round((p / 100) * (sorted.length - 1))),
    );
    return sorted[idx]!;
  };
  return {
    p0: pick(0),
    p25: pick(25),
    p50: pick(50),
    p75: pick(75),
    p100: pick(100),
  };
}
