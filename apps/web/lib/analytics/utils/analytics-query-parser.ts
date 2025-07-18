import { EventsFilters } from "../types";

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

  const filters: InternalFilter[] = [];

  // Split the query by logical operators (AND/OR) to handle multiple conditions
  // For now, we'll focus on single conditions, but this structure allows for future expansion
  const conditions = query.split(/\s+(?:AND|and|OR|or)\s+/);

  for (const condition of conditions) {
    const trimmedCondition = condition.trim();

    if (!trimmedCondition) {
      continue;
    }

    const filter = parseCondition(trimmedCondition);

    if (filter) {
      filters.push(filter);
    }
  }

  return filters.length > 0 ? filters : undefined;
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

  // Extract the matched groups
  const [, fieldOrMetadata, operator, value] = match;

  let operand: string;

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
