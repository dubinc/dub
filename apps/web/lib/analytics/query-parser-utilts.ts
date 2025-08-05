import { analyticsQuerySchema } from "../zod/schemas/analytics";

export type LogicalOperator = "AND" | "OR";

type Operand = keyof typeof analyticsQuerySchema.shape;

type TBOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "in";

export type InternalFilter = {
  operand: Operand;
  operator: TBOperator;
  value: string;
};

export type ParsedQuery = {
  filters: Partial<Record<Operand, { operator: TBOperator; value: any }>>;
  logicalOperator: LogicalOperator;
};

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
    operand: operand as Operand,
    operator: mapToInternalOperator(operator),
    value: value.trim().replace(/^['"`]|['"`]$/g, ""),
  };

  validateFilter(parsedFilter);

  return parsedFilter;
};

export const allowedOperands = Object.keys(analyticsQuerySchema.shape)
  .filter((key) => {
    return ![
      "tagId",
      "qr",
      "order",
      "query",
      "workspaceId",
      "page",
      "limit",
      "sortOrder",
      "sortBy",
    ].includes(key);
  })
  .concat(["metadata"]) as Operand[];

export const allowedOperators = (operand: Operand): TBOperator[] => {
  if (operand === "tagIds") {
    return ["equals", "in"];
  }

  return ["equals"];
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

  if (!allowedOperators(operand).includes(operator)) {
    throw new Error(
      `The operator is not supported for the field "${operand}".`,
    );
  }

  return true;
};

// Maps operator strings to our internal operator types
const mapToInternalOperator = (operator: string): TBOperator => {
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
