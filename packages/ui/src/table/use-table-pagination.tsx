import { PaginationState } from "@tanstack/react-table";
import { useEffect, useState } from "react";

export function useTablePagination({
  pageSize,
  offset,
  onOffsetChange,
}: {
  pageSize: number;
  offset: number;
  onOffsetChange?: (offset: number) => void;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  useEffect(() => {
    setPagination((p) => ({
      ...p,
      pageIndex: Math.floor(offset / p.pageSize),
    }));
  }, [offset]);

  useEffect(() => {
    onOffsetChange?.(pagination.pageIndex * pagination.pageSize);
  }, [pagination]);

  return { pagination, setPagination };
}
