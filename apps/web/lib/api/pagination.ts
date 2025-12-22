import { DubApiError } from "@/lib/api/errors";
import { Prisma } from "@prisma/client";

interface Filters {
  page: number;
  pageSize: number;
  startingAfter?: string | null;
  endingBefore?: string | null;
  sortBy: string;
  sortOrder: Prisma.SortOrder;
}

export interface PaginationOptions {
  cursor?: { id: string };
  skip: number;
  take: number;
  orderBy:
    | Record<string, Prisma.SortOrder>
    | Array<Record<string, Prisma.SortOrder>>;
}

const MAX_PAGE_VALUE = 100;

export function getPaginationOptions(filters: Filters): PaginationOptions {
  const { page, pageSize, startingAfter, endingBefore, sortBy, sortOrder } =
    filters;

  const useCursorPagination = !!startingAfter || !!endingBefore;

  if (startingAfter && endingBefore) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "You cannot use both startingAfter and endingBefore at the same time.",
    });
  }

  if (page > MAX_PAGE_VALUE) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Page is too big (cannot be more than ${MAX_PAGE_VALUE}), recommend using cursor-based pagination instead.`,
    });
  }

  const effectiveTake = useCursorPagination
    ? endingBefore
      ? -pageSize // Before cursor
      : pageSize // After cursor
    : pageSize;

  if (useCursorPagination) {
    return {
      cursor: {
        id: startingAfter || endingBefore!,
      },
      // Use a two-field sort: primary sort by the requested field, then by id as a tiebreaker.
      // This ensures deterministic ordering when multiple records have the same value for sortBy,
      // which is critical for cursor-based pagination to work correctly and consistently.
      orderBy: [
        {
          [sortBy]: sortOrder,
        },
        {
          id: sortOrder,
        },
      ],
      take: effectiveTake,
      skip: 1,
    };
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
    take: effectiveTake,
    skip: (page - 1) * pageSize,
  };
}
