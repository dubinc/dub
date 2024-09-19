import { PAGINATION_LIMIT } from "@dub/utils";
import { useEffect, useMemo } from "react";
import { useTablePagination } from "../table/use-table-pagination";
import { useRouterStuff } from "./use-router-stuff";

export type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

export function usePagination(pageSize = PAGINATION_LIMIT) {
  const { searchParams, queryParams } = useRouterStuff();

  const page = useMemo(
    () => parseInt(searchParams.get("page") || "1") || 1,
    [searchParams.get("page")],
  );

  const { pagination, setPagination } = useTablePagination({
    pageSize,
    page,
    onPageChange: (p) => {
      queryParams(
        p === 1
          ? { del: "page" }
          : {
              set: {
                page: p.toString(),
              },
            },
      );
    },
  });

  // Update state when URL parameter changes
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1") || 1;
    setPagination((p) => ({
      ...p,
      pageIndex: page,
    }));
  }, [searchParams.get("page")]);

  // Update URL parameter when state changes
  useEffect(() => {
    queryParams(
      pagination.pageIndex === 1
        ? { del: "page" }
        : {
            set: {
              page: pagination.pageIndex.toString(),
            },
          },
    );
  }, [pagination]);

  return { pagination, setPagination };
}
