import { ParsedFilter, type SQLOperator } from "@dub/utils";

/**
 * Advanced filter structure for Tinybird's filters JSON parameter.
 * Used for event-level dimensional filters.
 */
export interface AdvancedFilter {
  field: string;
  operator: SQLOperator;
  values: string[];
}

/**
 * Extract the first string value from a ParsedFilter.
 * Useful for API routes that need a single value (e.g., domain, folderId)
 * for lookups, even when the filter supports multiple values.
 */
export function getFirstFilterValue(
  filter: ParsedFilter | string | undefined,
): string | undefined {
  if (!filter) return undefined;
  if (typeof filter === "string") return filter;
  return filter.values?.[0];
}

/**
 * Prepare trigger and region filters for Tinybird pipes.
 * Handles backward compatibility for qr parameter and region splitting.
 */
export function prepareFiltersForPipe(params: {
  qr?: boolean;
  trigger?: ParsedFilter;
  region?: string | ParsedFilter;
  country?: ParsedFilter;
}) {
  // Handle qr backward compatibility
  let triggerForPipe = params.trigger;
  if (params.qr && !params.trigger) {
    triggerForPipe = {
      operator: "IS" as const,
      sqlOperator: "IN" as const,
      values: ["qr"],
    };
  }

  // Handle region split (format: "US-CA")
  let countryForPipe = params.country;
  let regionForPipe = params.region;
  if (params.region && typeof params.region === "string") {
    const split = params.region.split("-");
    countryForPipe = {
      operator: "IS" as const,
      sqlOperator: "IN" as const,
      values: [split[0]],
    };
    regionForPipe = split[1];
  }

  return { triggerForPipe, countryForPipe, regionForPipe };
}

/**
 * Normalize a filter value that may be a plain string (e.g. from partner-profile
 * routes) or an already-parsed ParsedFilter into a consistent ParsedFilter.
 *
 * Useful when callers pass a raw ID string but extractWorkspaceLinkFilters
 * expects a ParsedFilter with sqlOperator.
 */
export function ensureParsedFilter(
  value: string | ParsedFilter | undefined,
): ParsedFilter | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return {
      operator: "IS" as const,
      sqlOperator: "IN" as const,
      values: [value],
    };
  }
  return value;
}

/**
 * Extract workspace link filters (domain, tagIds, folderId, partnerId) into
 * separate values and operators for Tinybird.
 *
 * These filters are applied on the workspace_links node in Tinybird,
 * so they need to be passed as separate parameters (not in the filters JSON).
 */
export function extractWorkspaceLinkFilters(params: {
  linkId?: ParsedFilter;
  domain?: ParsedFilter;
  folderId?: ParsedFilter;
  tagId?: ParsedFilter;
  partnerId?: ParsedFilter;
  groupId?: ParsedFilter;
  tenantId?: ParsedFilter;
}) {
  const extractFilter = (filter?: ParsedFilter) => ({
    values: filter?.values,
    operator: (filter?.sqlOperator === "NOT IN" ? "NOT IN" : "IN") as
      | "IN"
      | "NOT IN",
  });

  const linkId = extractFilter(params.linkId);
  const domain = extractFilter(params.domain);
  const tagId = extractFilter(params.tagId);
  const folderId = extractFilter(params.folderId);
  const partnerId = extractFilter(params.partnerId);
  const groupId = extractFilter(params.groupId);
  const tenantId = extractFilter(params.tenantId);

  return {
    linkId: linkId.values,
    linkIdOperator: linkId.operator,
    domain: domain.values,
    domainOperator: domain.operator,
    tagId: tagId.values,
    tagIdOperator: tagId.operator,
    folderId: folderId.values,
    folderIdOperator: folderId.operator,
    partnerId: partnerId.values,
    partnerIdOperator: partnerId.operator,
    groupId: groupId.values,
    groupIdOperator: groupId.operator,
    tenantId: tenantId.values,
    tenantIdOperator: tenantId.operator,
  };
}

/**
 * Build advanced filters array for Tinybird's filters JSON parameter.
 * Extracts event-level dimensional filters from params and formats them
 * for the filters JSON that gets passed to Tinybird pipes.
 */
const SUPPORTED_FIELDS = [
  "country",
  "city",
  "continent",
  "device",
  "browser",
  "os",
  "referer",
  "refererUrl",
  "url",
  "trigger",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type SupportedField = (typeof SUPPORTED_FIELDS)[number];

export function buildAdvancedFilters(
  params: Partial<Record<SupportedField, ParsedFilter | undefined>>,
): AdvancedFilter[] {
  const filters: AdvancedFilter[] = [];

  for (const field of SUPPORTED_FIELDS) {
    const parsed = params[field];
    if (!parsed) continue;

    filters.push({
      field,
      operator: parsed.sqlOperator,
      values: parsed.values,
    });
  }

  return filters;
}
