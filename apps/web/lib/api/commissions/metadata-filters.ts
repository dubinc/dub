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

  return {
    key,
    op: mapOperator(operator),
    value,
  };
}

export function parseCommissionMetadataQuery(
  query: string | undefined,
): ParsedCommissionMetadataQuery | undefined {
  if (query == null || !query.trim()) {
    return undefined;
  }

  const trimmed = query.trim();
  const hasAnd = /\s+and\s+/i.test(trimmed);
  const hasOr = /\s+or\s+/i.test(trimmed);

  if (hasAnd && hasOr) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Metadata query cannot mix AND and OR.",
    });
  }

  const logic: "AND" | "OR" = hasOr ? "OR" : "AND";
  const conditions = trimmed.split(/\s+(?:and|or)\s+/i);
  const filters: CommissionMetadataFilter[] = [];

  for (const condition of conditions) {
    const trimmedCondition = condition.trim();
    if (!trimmedCondition) {
      continue;
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
