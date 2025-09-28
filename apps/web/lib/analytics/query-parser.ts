import {
  allowedOperands,
  InternalFilter,
  LogicalOperator,
  MAX_FILTERS,
  ParsedQuery,
  parseFilter,
} from "./query-parser-utilts";

export const queryParser = (
  query: string | undefined,
): ParsedQuery | undefined => {
  if (!query) {
    return undefined;
  }

  // Check for unsupported logical operators
  const unsupportedOperators = query.match(
    /\s+(?!(?:AND|and|OR|or)\b)\b[A-Za-z]{2,}\s+/,
  );

  if (unsupportedOperators) {
    throw new Error("Query must use either AND or OR.");
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

    const filter = parseFilter(trimmedCondition);

    if (!filter) {
      continue;
    }

    // Check if the operand is allowed
    const isAllowed = allowedOperands.some(
      (allowed) =>
        filter.operand === allowed || filter.operand.startsWith(`${allowed}.`),
    );

    if (!isAllowed) {
      throw new Error(
        `Field ${filter.operand} is an unsupported search field.`,
      );
    }

    filters.push(filter);
  }

  if (filters.length > MAX_FILTERS) {
    throw new Error(
      `Maximum number of filters exceeded. (Max: ${MAX_FILTERS})`,
    );
  }

  // Determine the logical operator used
  const logicalOperator: LogicalOperator = hasAnd
    ? "AND"
    : hasOr
      ? "OR"
      : "AND";

  if (filters.length === 0) {
    return;
  }

  // Transform the parsed filters to a format that can be used by Tinybird
  const parsedQuery: ParsedQuery = {
    filters: {},
    logicalOperator,
  };

  for (const filter of filters) {
    parsedQuery.filters[filter.operand] = {
      operator: filter.operator,
      value: filter.value,
    };
  }

  return parsedQuery;
};
