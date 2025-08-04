import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { EventsFilters } from "../types";

type LogicalOperator = "AND" | "OR";

const allowedOperands = Object.keys(analyticsQuerySchema.shape)
  .filter((key) => {
    // Filter out deprecated fields + query
    return !["tagId", "qr", "order", "query"].includes(key);
  })
  .concat(["metadata"]) as (keyof typeof analyticsQuerySchema.shape)[];

interface InternalFilter {
  operand: string;
  operator:
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "lessThan"
    | "greaterThanOrEqual"
    | "lessThanOrEqual";
  value: string;
}

// Query parser that can parse the query string into a list of filters
export const parseFiltersFromQuery = (query: EventsFilters["query"]) => {
  if (!query) {
    return undefined;
  }

  // Check for unsupported logical operators
  const unsupportedOperators = query.match(
    /\s+(?!(?:AND|and|OR|or)\b)\b[A-Za-z]{2,}\s+/,
  );

  if (unsupportedOperators) {
    throw new Error(`Query must use either AND or OR.`);
  }

  // Check for mixed AND/OR operators
  const hasAnd = /\s+(?:AND|and)\s+/.test(query);
  const hasOr = /\s+(?:OR|or)\s+/.test(query);

  if (hasAnd && hasOr) {
    throw new Error(
      "Query must use either AND or OR exclusively. Mixed logic is not allowed.",
    );
  }

  // Split the query by logical operators (AND/OR) to handle multiple conditions
  const conditions = query.split(/\s+(?:AND|and|OR|or)\s+/);
  const filters: InternalFilter[] = [];

  for (const condition of conditions) {
    const trimmedCondition = condition.trim();

    if (!trimmedCondition) {
      continue;
    }

    const filter = parseCondition(trimmedCondition);

    if (!filter) {
      continue;
    }

    // Check if the operand is allowed
    const isOperandAllowed = allowedOperands.some(
      (allowed) =>
        filter.operand === allowed || filter.operand.startsWith(`${allowed}.`),
    );

    if (!isOperandAllowed) {
      throw new Error(
        `Field ${filter.operand} is an unsupported search field.`,
      );
    }

    filters.push(filter);
  }

  // Determine the logical operator used
  const logicalOperator: LogicalOperator = hasAnd
    ? "AND"
    : hasOr
      ? "OR"
      : "AND";

  return filters.length > 0 ? { filters, logicalOperator } : undefined;
};

// Parses a single condition in the format: field:value, field>value, or metadata['key']:value
function parseCondition(condition: string): InternalFilter | null {
  // This regex captures:
  // 1. field - either a regular field name OR metadata with bracket notation (supports both single and double quotes)
  // 2. operator - :, >, <, >=, <=, !=
  // 3. value - the value after the operator (supports quoted and unquoted values)
  const unifiedPattern =
    /^([a-zA-Z_][a-zA-Z0-9_]*|metadata\[['"][^'"]*['"]\](?:\[['"][^'"]*['"]\])*)\s*([:><=!]+)\s*(.+)$/;

  const match = condition.match(unifiedPattern);

  if (!match) {
    return null;
  }

  let operand: string;
  const [, fieldOrMetadata, operator, value] = match;

  // Determine the operand based on whether it's metadata or a regular field
  if (fieldOrMetadata.startsWith("metadata")) {
    const keyPath = fieldOrMetadata.replace(/^metadata/, "");

    const extractedKey = keyPath
      .replace(/^\[['"]|['"]\]$/g, "") // Remove leading [' or [" and trailing '] or "]
      .replace(/\[['"]/g, ".") // Replace [' or [" with .
      .replace(/['"]\]/g, ""); // Remove trailing '] or "]

    operand = `metadata.${extractedKey}`;
  } else {
    operand = fieldOrMetadata;
  }

  return {
    operand,
    operator: mapOperator(operator),
    value: value.trim().replace(/^['"`]|['"`]$/g, ""),
  };
}

// Maps operator strings to our internal operator types
function mapOperator(operator: string): InternalFilter["operator"] {
  switch (operator) {
    case ":":
    case "=":
      return "equals";
    case ">":
      return "greaterThan";
    case "<":
      return "lessThan";
    case ">=":
      return "greaterThanOrEqual";
    case "<=":
      return "lessThanOrEqual";
    case "!=":
      return "notEquals";
    default:
      // For unsupported operators, default to equals
      return "equals";
  }
}
