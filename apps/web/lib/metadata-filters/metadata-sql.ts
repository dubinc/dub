import { Prisma } from "@prisma/client";
import type { MetadataFilter } from "./parse-metadata-query";

const OPERATOR_SQL_MAP: Record<MetadataFilter["operator"], string> = {
  equals: "=",
  notEquals: "!=",
  greaterThan: ">",
  lessThan: "<",
  greaterThanOrEqual: ">=",
  lessThanOrEqual: "<=",
};

/**
 * Build AND-ed JSON_UNQUOTE(JSON_EXTRACT(...)) predicates for metadata filters.
 * Keys must already be validated as top-level identifiers (see parseMetadataQuery).
 */
export function buildMetadataSql(
  filters: MetadataFilter[],
  column: Prisma.Sql = Prisma.raw("c.metadata"),
): Prisma.Sql {
  const conditions = filters.map((filter) => {
    const op = OPERATOR_SQL_MAP[filter.operator];
    // Key is validated as [A-Za-z0-9_]+ before reaching here
    const jsonPath = `$.${filter.key}`;

    return Prisma.sql`JSON_UNQUOTE(JSON_EXTRACT(${column}, ${jsonPath})) ${Prisma.raw(op)} ${filter.value}`;
  });

  return Prisma.join(conditions, " AND ");
}
