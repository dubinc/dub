import { DubApiError } from "@/lib/api/errors";
import { Prisma } from "@prisma/client";

interface Filters {
  page?: number;
  pageSize: number;
  startingAfter?: string | null;
  endingBefore?: string | null;
  sortBy: string;
  sortOrder: Prisma.SortOrder;
}

interface PaginationQuery {
  cursor?: { id: string };
  skip: number;
  take: number;
  orderBy:
    | Record<string, Prisma.SortOrder>
    | Array<Record<string, Prisma.SortOrder>>;
}

export const MAX_OFFSET_PAGE = 1000;

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface PaginationSql {
  cursorSql: Prisma.Sql;
  orderBySql: Prisma.Sql;
  limit: number;
  offsetSql: Prisma.Sql;
  reverse: boolean;
}

export function buildPaginationQuery(filters: Filters): PaginationQuery {
  let { page, pageSize, startingAfter, endingBefore, sortBy, sortOrder } =
    filters;

  const useCursorPagination = !!startingAfter || !!endingBefore;

  // Cursor pagination validations
  if (startingAfter && endingBefore) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "You cannot use both startingAfter and endingBefore at the same time.",
    });
  }

  if (useCursorPagination && sortBy !== "createdAt") {
    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "Cursor-based pagination only supports sorting by `createdAt`. Use offset-based pagination (page/pageSize) for other sort fields.",
    });
  }

  if (useCursorPagination && page) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "You cannot use both page and startingAfter/endingBefore at the same time. Please use one pagination method.",
    });
  }

  if (useCursorPagination) {
    const cursorId = startingAfter || endingBefore!;

    return {
      cursor: {
        id: cursorId,
      },
      orderBy: {
        id: sortOrder,
      },
      take: endingBefore ? -pageSize : pageSize,
      skip: 1,
    };
  }

  page = page ?? 1;

  // Offset pagination validations
  if (page > MAX_OFFSET_PAGE) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Page is too big (cannot be more than ${MAX_OFFSET_PAGE}), recommend using cursor-based pagination instead.`,
    });
  }

  return {
    // Order by id only for better query performance on large datasets (single-column PK index).
    // Trade-off: ordering is by id rather than createdAt, so order may not strictly match creation time.
    orderBy: {
      [sortBy]: sortOrder,
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
  };
}

/**
 * SQL equivalent of buildPaginationQuery for $queryRaw.
 * Cursor uses id inequality (no OFFSET); endingBefore sets reverse.
 */
export function buildPaginationSql({
  filters,
  alias,
  allowedSortBy,
}: {
  filters: Filters;
  alias: string;
  allowedSortBy: readonly string[];
}): PaginationSql {
  if (!SQL_IDENT.test(alias)) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Invalid table alias: ${alias}`,
    });
  }

  const { take, skip, cursor, orderBy } = buildPaginationQuery(filters);
  // Cursor pagination orders by id (see buildPaginationQuery), not createdAt.
  const allowed = new Set(["id", ...allowedSortBy]);

  // Examples with alias "c", sortOrder desc, pageSize 25:
  // offset page 1  → cursorSql: (empty)
  //                   orderBySql: c.`createdAt` DESC
  // offset page 2  → cursorSql: (empty)
  //                   orderBySql: c.`createdAt` DESC  + OFFSET 25
  // startingAfter  → cursorSql: AND c.id < ?
  //                   orderBySql: c.`id` DESC
  // endingBefore   → cursorSql: AND c.id > ?
  //                   orderBySql: c.`id` DESC  + reverse rows
  return {
    cursorSql: buildCursorSql({
      cursor,
      take,
      sortOrder: filters.sortOrder,
      alias,
    }),
    orderBySql: buildOrderBySql({
      orderBy,
      alias,
      allowed,
    }),
    offsetSql: !cursor && skip > 0 ? Prisma.sql`OFFSET ${skip}` : Prisma.empty,
    limit: Math.abs(take),
    reverse: take < 0,
  };
}

function buildOrderBySql({
  orderBy,
  alias,
  allowed,
}: {
  orderBy: PaginationQuery["orderBy"];
  alias: string;
  allowed: Set<string>;
}): Prisma.Sql {
  const entries = Array.isArray(orderBy)
    ? orderBy.flatMap((o) => Object.entries(o))
    : Object.entries(orderBy);

  const parts = entries.map(([field, direction]) => {
    if (!allowed.has(field) || !SQL_IDENT.test(field)) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `Invalid sort field: ${field}`,
      });
    }

    const dir = direction === "asc" ? "ASC" : "DESC";
    return Prisma.sql`${Prisma.raw(`${alias}.\`${field}\``)} ${Prisma.raw(dir)}`;
  });

  return Prisma.join(parts, ", ");
}

function buildCursorSql({
  cursor,
  take,
  sortOrder,
  alias,
}: {
  cursor: { id: string } | undefined;
  take: number;
  sortOrder: Prisma.SortOrder;
  alias: string;
}): Prisma.Sql {
  if (!cursor) {
    return Prisma.empty;
  }

  const forward = take > 0;
  const useGreaterThan = forward === (sortOrder === "asc");

  return useGreaterThan
    ? Prisma.sql`AND ${Prisma.raw(`${alias}.id`)} > ${cursor.id}`
    : Prisma.sql`AND ${Prisma.raw(`${alias}.id`)} < ${cursor.id}`;
}
