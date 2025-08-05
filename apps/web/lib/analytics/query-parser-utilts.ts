import { analyticsQuerySchema } from "../zod/schemas/analytics";

export type LogicalOperator = "AND" | "OR";

export type Operator = "=" | "!=" | ">" | "<" | ">=" | "<=";

export interface InternalFilter {
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

export const MAX_FILTERS = 10;

export const allowedOperands = Object.keys(analyticsQuerySchema.shape)
  .filter((key) => {
    return !["tagId", "qr", "order", "query"].includes(key);
  })
  .concat(["metadata"]) as (keyof typeof analyticsQuerySchema.shape)[];

export const allowedOperators: Record<string, Operator[]> = {
  // TODO
};

// Parses a single condition in the format: field:value, field>value, or metadata['key']:value
export const parseCondition = (condition: string): InternalFilter | null => {
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
};

// Maps operator strings to our internal operator types
const mapOperator = (operator: string): InternalFilter["operator"] => {
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
};
