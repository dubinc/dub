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

interface Options {
  cursor?: { id: string };
  skip: number;
  orderBy: Record<string, Prisma.SortOrder>;
  take: number;
}

export function getPaginationOptions(filters: Filters): Options {
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

  const effectiveSortOrder = useCursorPagination ? "desc" : sortOrder;
  const effectiveSortBy = useCursorPagination ? "createdAt" : sortBy;
  const effectiveTake = useCursorPagination
    ? endingBefore
      ? -pageSize // Before cursor
      : pageSize // After cursor
    : pageSize;

  const commonPrismaOptions: Pick<Options, "orderBy" | "take"> = {
    orderBy: {
      [effectiveSortBy]: effectiveSortOrder,
    },
    take: effectiveTake,
  };

  if (useCursorPagination) {
    return {
      cursor: {
        id: startingAfter || endingBefore!,
      },
      skip: 1,
      ...commonPrismaOptions,
    };
  }

  return {
    skip: (page - 1) * pageSize,
    ...commonPrismaOptions,
  };
}
