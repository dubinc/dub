import { DubApiError } from "@/lib/api/errors";
import { Prisma } from "@dub/prisma/client";

interface Filters {
  page: number;
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

const MAX_PAGE_VALUE = 100;

export function buildPaginationQuery(filters: Filters): PaginationQuery {
  const { page, pageSize, startingAfter, endingBefore, sortBy, sortOrder } =
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

  if (useCursorPagination && page > 1) {
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
      // Use a two-field sort: primary sort by createdAt, then by id as a tiebreaker.
      // This ensures deterministic ordering when multiple records have the same createdAt,
      // which is critical for cursor-based pagination to work correctly and consistently.
      orderBy: [
        {
          createdAt: sortOrder,
        },
        {
          id: sortOrder,
        },
      ],
      take: endingBefore ? -pageSize : pageSize,
      skip: 1,
    };
  }

  // Offset pagination validations
  if (page > MAX_PAGE_VALUE) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Page is too big (cannot be more than ${MAX_PAGE_VALUE}), recommend using cursor-based pagination instead.`,
    });
  }

  return {
    orderBy: [
      {
        [sortBy]: sortOrder,
      },
      {
        id: sortOrder,
      },
    ],
    take: pageSize,
    skip: (page - 1) * pageSize,
  };
}
