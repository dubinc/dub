import { metadataQueryParser } from "@/lib/analytics/metadata-query-parser";
import { DubApiError } from "@/lib/api/errors";

export type MetadataFilter = {
  key: string;
  operator:
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "lessThan"
    | "greaterThanOrEqual"
    | "lessThanOrEqual";
  value: string;
};

const TOP_LEVEL_KEY = /^[A-Za-z0-9_]+$/;

// Parse and validate a `query` param (events-style metadata search).
export function parseMetadataQuery(
  query: string | undefined,
): MetadataFilter[] | undefined {
  if (query === undefined || query === "") {
    return undefined;
  }

  const invalidMetadataQueryError = new DubApiError({
    code: "unprocessable_entity",
    message:
      "Invalid metadata query. Use top-level keys only, e.g. metadata['key']:'value'. Nested keys and OR are not supported.",
  });

  if (/\s+(?:OR|or)\s+/.test(query)) {
    throw invalidMetadataQueryError;
  }

  const parsed = metadataQueryParser(query);

  if (!parsed || parsed.length === 0) {
    throw invalidMetadataQueryError;
  }

  return parsed.map((filter) => {
    if (!filter.operand.startsWith("metadata.")) {
      throw invalidMetadataQueryError;
    }

    const key = filter.operand.slice("metadata.".length);

    if (!key || key.includes(".") || !TOP_LEVEL_KEY.test(key)) {
      throw invalidMetadataQueryError;
    }

    return {
      key,
      operator: filter.operator,
      value: filter.value,
    };
  });
}
