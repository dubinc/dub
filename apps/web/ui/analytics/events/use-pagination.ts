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
    const offset = parseInt(searchParams.get("offset") || "0") || 0;
    setPagination((p) => ({
      ...p,
      pageIndex: Math.floor(offset / p.pageSize),
    }));
  }, [searchParams.get("offset")]);

  // Update URL parameter when state changes
  useEffect(() => {
    const offset = pagination.pageIndex * pagination.pageSize;
    queryParams(
      offset === 0
        ? { del: "offset" }
        : {
            set: {
              offset: offset.toString(),
            },
          },
    );
  }, [pagination]);

  return { pagination, setPagination };
}
