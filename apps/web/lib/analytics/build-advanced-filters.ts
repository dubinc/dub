import { ParsedFilter, type SQLOperator } from "@dub/utils";

export interface AdvancedFilter {
  field: string;
  operator: SQLOperator;
  values: string[];
}

// All fields that support advanced filtering with operators (IN, NOT IN)
// These fields will be passed via the JSON filters array to Tinybird
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
  "domain",
  "tagIds",
  "folderId",
  "root",
  "saleType",
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
