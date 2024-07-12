import { useRouterStuff } from "@dub/ui";
import { PaginationState } from "@tanstack/react-table";
import { useEffect, useState } from "react";

export default function usePagination(pageSize: number) {
  const { searchParams, queryParams } = useRouterStuff();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
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
    const page = pagination.pageIndex;
    queryParams(
      page === 0
        ? { del: "page" }
        : {
            set: {
              page: page.toString(),
            },
          },
    );
  }, [pagination]);

  return { pagination, setPagination };
}
