import { EventsFilters } from "../types";

interface Filter {
  operand: string;
  operator: "=" | ">" | "<" | ">=" | "<=" | "!=";
  value: string;
}

// Query parser that can parse the query string into a list of filters
export const parseFiltersFromQuery = (query: EventsFilters["query"]) => {
  if (!query) {
    return undefined;
  }

  const filters: Filter[] = [];

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

  console.log("filters", filters);

  return filters.length > 0 ? filters : undefined;
};

// Parses a single condition in the format: field:value, field>value, or metadata['key']:value
function parseCondition(condition: string): Filter | null {
  // Unified regex pattern that handles both regular fields and metadata fields
  // This regex captures:
  // 1. field - either a regular field name OR metadata with bracket notation
  // 2. operator - :, >, <, >=, <=, !=
  // 3. value - the value after the operator (supports quoted and unquoted values)
  const unifiedPattern =
    /^([a-zA-Z_][a-zA-Z0-9_]*|metadata\['[^']*'\](?:\['[^']*'\])*)\s*([:><=!]+)\s*(.+)$/;

  const match = condition.match(unifiedPattern);

  if (!match) {
    return null;
  }

  // Extract the matched groups
  const [, fieldOrMetadata, operator, value] = match;

  // Clean up the value by removing surrounding quotes if present
  const cleanValue = value.trim().replace(/^['"`]|['"`]$/g, "");

  // Determine the operand based on whether it's metadata or a regular field
  let operand: string;

  if (fieldOrMetadata.startsWith("metadata")) {
    const keyPath = fieldOrMetadata.replace(/^metadata/, "");

    operand = keyPath
      .replace(/^\['|'\]$/g, "") // Remove leading [' and trailing ']
      .replace(/\['/g, ".") // Replace [' with .
      .replace(/'\]/g, ""); // Remove trailing ']
  } else {
    operand = fieldOrMetadata;
  }

  const filterOperator = mapOperator(operator);

  return {
    operand,
    operator: filterOperator,
    value: cleanValue,
  };
}

// Maps operator strings to our internal operator types
function mapOperator(operator: string): Filter["operator"] {
  switch (operator) {
    case ":":
      return "=";
    case ">":
      return ">";
    case "<":
      return "<";
    case ">=":
      return ">=";
    case "<=":
      return "<=";
    case "!=":
      return "!=";
    default:
      // For unsupported operators, default to equals
      return "=";
  }
}
