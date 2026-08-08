import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import {
  PartnerSearchFilters,
  PartnerSearchListFilter,
  PartnerSearchMetricField,
  PartnerSearchQuery,
  PartnerSearchRangeFilter,
} from "./types";

export type PartnerSearchQueryInput = z.infer<
  typeof getPartnersQuerySchemaExtended
> & {
  programId: string;
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

function buildListFilter(
  values: string | string[] | undefined,
  operator: "IN" | "NOT IN" | undefined,
): PartnerSearchListFilter | undefined {
  if (values === undefined) {
    return undefined;
  }

  const normalizedValues = (Array.isArray(values) ? values : [values]).filter(
    Boolean,
  );
  if (normalizedValues.length === 0) {
    return undefined;
  }

  return {
    values: normalizedValues,
    operator: operator === "NOT IN" ? "NOT_IN" : "IN",
  };
}

function addMetricRange(
  metrics: NonNullable<PartnerSearchFilters["metrics"]>,
  field: PartnerSearchMetricField,
  min: number | undefined,
  max: number | undefined,
) {
  if (min === undefined && max === undefined) {
    return;
  }

  const range: PartnerSearchRangeFilter = {};
  if (min !== undefined) {
    range.min = min;
  }
  if (max !== undefined) {
    range.max = max;
  }
  metrics[field] = range;
}

export function buildPartnerSearchQuery({
  programId,
  search,
  email,
  tenantId,
  page = 1,
  pageSize,
  sortBy,
  sortOrder,
  status,
  partnerIds,
  groupId,
  groupIdOperator,
  country,
  countryOperator,
  partnerTagId,
  partnerTagIdOperator,
  referredByPartnerId,
  totalClicksMin,
  totalClicksMax,
  totalLeadsMin,
  totalLeadsMax,
  totalConversionsMin,
  totalConversionsMax,
  totalSaleAmountMin,
  totalSaleAmountMax,
  totalCommissionsMin,
  totalCommissionsMax,
}: PartnerSearchQueryInput): PartnerSearchQuery | null {
  const query = search?.trim();

  // Keep exact lookups on the database and use search for free-text queries.
  if (!query || email || tenantId) {
    return null;
  }

  const metrics: NonNullable<PartnerSearchFilters["metrics"]> = {};
  addMetricRange(metrics, "totalClicks", totalClicksMin, totalClicksMax);
  addMetricRange(metrics, "totalLeads", totalLeadsMin, totalLeadsMax);
  addMetricRange(
    metrics,
    "totalConversions",
    totalConversionsMin,
    totalConversionsMax,
  );
  addMetricRange(
    metrics,
    "totalSaleAmount",
    totalSaleAmountMin,
    totalSaleAmountMax,
  );
  addMetricRange(
    metrics,
    "totalCommissions",
    totalCommissionsMin,
    totalCommissionsMax,
  );

  const filters: PartnerSearchFilters = {
    status,
    partnerIds,
    groupIds: buildListFilter(groupId, groupIdOperator),
    countries: buildListFilter(country, countryOperator),
    partnerTagIds: buildListFilter(partnerTagId, partnerTagIdOperator),
    referredByPartnerId,
    ...(Object.keys(metrics).length > 0 && { metrics }),
  };

  return {
    programId,
    query,
    page,
    pageSize,
    filters,
    sort: {
      field: sortBy,
      order: sortOrder,
    },
  };
}
