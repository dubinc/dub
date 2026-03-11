import { DubApiError } from "@/lib/api/errors";
import { Prisma } from "@dub/prisma/client";

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
