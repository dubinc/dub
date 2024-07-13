import { useRouterStuff, useTablePagination } from "@dub/ui";
import { useEffect, useMemo } from "react";

export default function usePagination(pageSize: number) {
  const { searchParams, queryParams } = useRouterStuff();

  const page = useMemo(
    () => parseInt(searchParams.get("page") || "0") || 0,
    [searchParams.get("page")],
  );

  const { pagination, setPagination } = useTablePagination({
    pageSize,
    page,
    onPageChange: (p) => {
      queryParams(
        p === 0
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
    const page = parseInt(searchParams.get("page") || "0") || 0;
    setPagination((p) => ({
      ...p,
      pageIndex: page,
    }));
  }, [searchParams.get("page")]);

  // Update URL parameter when state changes
  useEffect(() => {
    queryParams(
      pagination.pageIndex === 0
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
