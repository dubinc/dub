import { PAGINATION_LIMIT } from "@dub/utils";
import { useMemo } from "react";
import { useRouterStuff } from "./use-router-stuff";

export type CursorPaginationState = {
  startingAfter?: string;
  endingBefore?: string;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function useCursorPagination(pageSize = PAGINATION_LIMIT) {
  const { searchParams, queryParams } = useRouterStuff();

  const startingAfter = searchParams.get("startingAfter") || undefined;
  const endingBefore = searchParams.get("endingBefore") || undefined;

  const pagination = useMemo(
    () => ({
      startingAfter,
      endingBefore,
      pageSize,
      hasNextPage: false, // Will be set by the component using this hook
      hasPreviousPage: false, // Will be set by the component using this hook
    }),
    [startingAfter, endingBefore, pageSize],
  );

  const setPagination = (newPagination: Partial<CursorPaginationState>) => {
    if (newPagination.startingAfter) {
      queryParams({
        set: { startingAfter: newPagination.startingAfter },
        del: "endingBefore",
        scroll: false,
      });
    } else if (newPagination.endingBefore) {
      queryParams({
        set: { endingBefore: newPagination.endingBefore },
        del: "startingAfter",
        scroll: false,
      });
    } else {
      queryParams({
        del: ["startingAfter", "endingBefore"],
        scroll: false,
      });
    }
  };

  const goToNextPage = (lastItemId: string) => {
    setPagination({ startingAfter: lastItemId });
  };

  const goToPreviousPage = (firstItemId: string) => {
    setPagination({ endingBefore: firstItemId });
  };

  const resetPagination = () => {
    queryParams({
      del: ["startingAfter", "endingBefore"],
      scroll: false,
    });
  };

  return {
    pagination,
    setPagination,
    goToNextPage,
    goToPreviousPage,
    resetPagination,
  };
}
