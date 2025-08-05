import { analyticsQuerySchema } from "../zod/schemas/analytics";

export type LogicalOperator = "AND" | "OR";

export type Operator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "in";

type TBOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "in";

export interface InternalFilter {
  operand: string;
  operator: TBOperator;
  value: string;
}

// Combine up to 10 filter clauses in a query
export const MAX_FILTERS = 10;

// Parses a single condition in the format: field:value, field>value, or metadata['key']:value
export const parseFilter = (condition: string): InternalFilter | null => {
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

  const parsedFilter = {
    operand,
    operator: mapOperator(operator),
    value: value.trim().replace(/^['"`]|['"`]$/g, ""),
  };

  validateFilter(parsedFilter);

  return parsedFilter;
};

export const validateFilter = ({
  operand,
  operator,
  value,
}: InternalFilter) => {
  if (operand.startsWith("metadata.")) {
    return true;
  }

  const schema =
    analyticsQuerySchema.shape[
      operand as keyof typeof analyticsQuerySchema.shape
    ];

  if (!schema) {
    throw new Error(`Invalid field "${operand}".`);
  }

  if (!schema.safeParse(value).success) {
    throw new Error(`Invalid value for the field "${operand}".`);
  }

  if (!allowedOperators[operand].includes(operator)) {
    throw new Error(
      `The operator is not supported for the field "${operand}".`,
    );
  }

  return true;
};

// Supported operands for the query
export const allowedOperands = Object.keys(analyticsQuerySchema.shape)
  .filter((key) => {
    return !["tagId", "qr", "order", "query"].includes(key);
  })
  .concat(["metadata"]) as (keyof typeof analyticsQuerySchema.shape)[];

// Supported operators for each operand
// TODO: We should expand this to support is_in, is_not, etc.
export const allowedOperators: Record<string, TBOperator[]> = {
  event: ["equals"],
  groupBy: ["equals"],
  domain: ["equals"],
  key: ["equals"],
  linkId: ["equals"],
  externalId: ["equals"],
  tenantId: ["equals"],
  programId: ["equals"],
  partnerId: ["equals"],
  customerId: ["equals"],
  interval: ["equals"],
  start: ["equals"],
  end: ["equals"],
  timezone: ["equals"],
  country: ["equals"],
  city: ["equals"],
  region: ["equals"],
  continent: ["equals"],
  device: ["equals"],
  browser: ["equals"],
  os: ["equals"],
  trigger: ["equals"],
  referer: ["equals"],
  refererUrl: ["equals"],
  url: ["equals"],
  tagIds: ["equals", "in"],
  folderId: ["equals"],
  root: ["equals"],
  saleType: ["equals"],
  utm_source: ["equals"],
  utm_medium: ["equals"],
  utm_campaign: ["equals"],
  utm_term: ["equals"],
  utm_content: ["equals"],
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
    case "in":
      return "in";
    default:
      // For unsupported operators, default to equals
      return "equals";
  }
};
