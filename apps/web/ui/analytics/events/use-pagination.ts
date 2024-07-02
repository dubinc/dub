import { useRouterStuff, useTablePagination } from "@dub/ui";
import { useEffect, useMemo } from "react";

export default function usePagination(pageSize: number) {
  const { searchParams, queryParams } = useRouterStuff();

  const offset = useMemo(
    () => parseInt(searchParams.get("offset") || "0") || 0,
    [searchParams.get("offset")],
  );

  const { pagination, setPagination } = useTablePagination({
    pageSize,
    offset,
    onOffsetChange: (offset) => {
      queryParams(
        offset === 0
          ? { del: "offset" }
          : {
              set: {
                offset: offset.toString(),
              },
            },
      );
    },
  });

  // Update state when URL parameter changes
  useEffect(() => {
    setPagination((p) => ({
      ...p,
      pageIndex: Math.floor(offset / p.pageSize),
    }));
  }, [offset]);

  return { pagination, setPagination };
}
