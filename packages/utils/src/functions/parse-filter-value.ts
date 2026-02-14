export type FilterOperator = "IS" | "IS_NOT" | "IS_ONE_OF" | "IS_NOT_ONE_OF";
export type SQLOperator = "IN" | "NOT IN";

export interface ParsedFilter {
  operator: FilterOperator;
  sqlOperator: SQLOperator;
  values: string[];
}

/**
 * Parse filter value from URL format to structured filter
 *
 * Formats supported:
 * - "US" → IS, values: ["US"], SQL: IN
 * - "US,BR,FR" → IS_ONE_OF, values: ["US", "BR", "FR"], SQL: IN
 * - "-US" → IS_NOT, values: ["US"], SQL: NOT IN
 * - "-US,BR" → IS_NOT_ONE_OF, values: ["US", "BR"], SQL: NOT IN
 *
 * Note: All filters now use IN/NOT IN operators for consistency,
 * even for single values. This simplifies SQL query generation.
 *
 * @param value - The filter value string (can include "-" prefix for negation)
 * @returns Parsed filter with operator and values array
 */
export function parseFilterValue(
  value: string | string[] | undefined,
): ParsedFilter | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return {
      operator: value.length > 1 ? "IS_ONE_OF" : "IS",
      sqlOperator: "IN",
      values: value,
    };
  }

  const isNegated = value.startsWith("-");
  const cleanValue = isNegated ? value.slice(1) : value;
  const values = cleanValue.split(",").filter(Boolean);

  if (values.length === 0) return undefined;

  const operator: FilterOperator = isNegated
    ? values.length > 1
      ? "IS_NOT_ONE_OF"
      : "IS_NOT"
    : values.length > 1
      ? "IS_ONE_OF"
      : "IS";

  const sqlOperator: SQLOperator = isNegated ? "NOT IN" : "IN";

  return { operator, sqlOperator, values };
}

/**
 * Build filter value string from parsed filter
 *
 * @param parsed - The parsed filter object
 * @returns URL-formatted filter string
 */
export function buildFilterValue(parsed: ParsedFilter): string {
  const joined = parsed.values.join(",");
  return parsed.operator.includes("NOT") ? `-${joined}` : joined;
}
