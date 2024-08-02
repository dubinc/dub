import { PaginationState } from "@tanstack/react-table";
import { useEffect, useState } from "react";

export function useTablePagination({
  pageSize,
  page,
  onPageChange,
}: {
  pageSize: number;
  page: number;
  onPageChange?: (page: number) => void;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: page,
    pageSize,
  });

  useEffect(() => {
    setPagination((p) => ({
      ...p,
      pageIndex: page,
    }));
  }, [page]);

  useEffect(() => {
    onPageChange?.(pagination.pageIndex);
  }, [pagination]);

  return { pagination, setPagination };
}
