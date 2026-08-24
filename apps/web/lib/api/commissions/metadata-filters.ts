import { Prisma } from "@prisma/client";
import { DubApiError } from "../errors";

export type CommissionMetadataFilterOp = "equals" | "notEquals";

export type CommissionMetadataFilter = {
  key: string;
  op: CommissionMetadataFilterOp;
  value: string;
};

export type ParsedCommissionMetadataQuery = {
  logic: "AND" | "OR";
  filters: CommissionMetadataFilter[];
};

const MAX_METADATA_FILTER_CONDITIONS = 5;

function mapOperator(operator: string): CommissionMetadataFilterOp {
  switch (operator) {
    case ":":
    case "=":
      return "equals";
    case "!=":
      return "notEquals";
    default:
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Metadata query only supports `=` and `!=` operators.",
      });
  }
}

function parseCondition(condition: string): CommissionMetadataFilter {
  // Top-level metadata['key'] / metadata["key"] only — nested brackets fail the match.
  const match = condition.match(
    /^metadata\[['"]([A-Za-z0-9_]+)['"]\]\s*(!=|>=|<=|:|=|>|<)\s*(.+)$/,
  );

  if (!match) {
    const invalidKeyMatch = condition.match(
      /^metadata\[['"]([^'"]+)['"]\]\s*(!=|>=|<=|:|=|>|<)\s*(.+)$/,
    );

    if (invalidKeyMatch && !/^[A-Za-z0-9_]+$/.test(invalidKeyMatch[1])) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message:
          "Invalid metadata query. Metadata keys may only contain letters, numbers, and underscores.",
      });
    }

    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "Invalid metadata query. Use top-level keys only, e.g. `metadata['key']='value'`.",
    });
  }

  const [, key, operator, rawValue] = match;
  const value = rawValue.trim().replace(/^['"`]|['"`]$/g, "");

  if (!value) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Invalid metadata query: empty filter value.",
    });
  }

  // e.g. `==` leaves a leftover that starts with `=` after the first `=` is matched.
  if (/^[=:!<>]/.test(value)) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Metadata query only supports `=` and `!=` operators.",
    });
  }

  return {
    key,
    op: mapOperator(operator),
    value,
  };
}

/** Mask quoted segments so AND/OR inside values are not treated as connectives. */
function maskQuotedSegments(query: string): string {
  return query.replace(/'[^']*'|"[^"]*"/g, (match) =>
    "\u0000".repeat(match.length),
  );
}

/** Split on AND/OR outside quotes by finding connectives on a masked copy. */
function splitConditionsOutsideQuotes(query: string): string[] {
  const masked = maskQuotedSegments(query);
  const connective = /\s+(?:and|or)\s+/gi;
  const conditions: string[] = [];
  let lastIndex = 0;

  for (const match of masked.matchAll(connective)) {
    const start = match.index ?? 0;
    conditions.push(query.slice(lastIndex, start));
    lastIndex = start + match[0].length;
  }

  conditions.push(query.slice(lastIndex));
  return conditions;
}

export function parseCommissionMetadataQuery(
  query: string | undefined,
): ParsedCommissionMetadataQuery | undefined {
  if (query == null || !query.trim()) {
    return undefined;
  }

  const trimmed = query.trim();
  const masked = maskQuotedSegments(trimmed);

  if (/\s+(?:and|or)\s*$/i.test(masked)) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Invalid metadata query.",
    });
  }

  const hasAnd = /\s+and\s+/i.test(masked);
  const hasOr = /\s+or\s+/i.test(masked);

  if (hasAnd && hasOr) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Metadata query cannot mix AND and OR.",
    });
  }

  const logic: "AND" | "OR" = hasOr ? "OR" : "AND";
  const conditions = splitConditionsOutsideQuotes(trimmed);
  const filters: CommissionMetadataFilter[] = [];

  for (const condition of conditions) {
    const trimmedCondition = condition.trim();
    if (!trimmedCondition) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Invalid metadata query.",
      });
    }
    filters.push(parseCondition(trimmedCondition));
  }

  if (filters.length === 0) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Invalid metadata query.",
    });
  }

  if (filters.length > MAX_METADATA_FILTER_CONDITIONS) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Metadata query supports at most ${MAX_METADATA_FILTER_CONDITIONS} conditions.`,
    });
  }

  return {
    logic,
    filters,
  };
}

export function buildCommissionMetadataWhere(
  parsed: ParsedCommissionMetadataQuery | undefined,
): Prisma.CommissionWhereInput | undefined {
  if (!parsed) {
    return undefined;
  }

  const clauses: Prisma.CommissionWhereInput[] = parsed.filters.map(
    (filter) => ({
      metadata:
        filter.op === "equals"
          ? { path: `$.${filter.key}`, equals: filter.value }
          : { path: `$.${filter.key}`, not: filter.value },
    }),
  );

  if (clauses.length === 1) {
    return clauses[0];
  }

  return parsed.logic === "OR" ? { OR: clauses } : { AND: clauses };
}
