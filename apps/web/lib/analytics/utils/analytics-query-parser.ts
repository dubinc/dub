import { z } from "zod";
import { EventsFilters } from "../types";

interface Filter {
  operand: string;
  operator: "equals"; // can be expanded later
  value: string;
}

export const parseFiltersFromQuery = (query: EventsFilters["query"]) => {
  if (!query) {
    return undefined;
  }

  const result = z
    .object({
      metadata: z.record(z.string(), z.string()),
    })
    .safeParse(query);

  if (!result.success) {
    console.log(`Ignoring the invalid query ${JSON.stringify(query)}`);
    return undefined;
  }

  const filters: Filter[] = Object.entries(result.data.metadata)
    .slice(0, 1)
    .map(([key, value]) => {
      return {
        operand: key,
        operator: "equals",
        value,
      };
    });

  console.log("filters", filters);

  return filters;
};
