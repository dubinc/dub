import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { usePagination, useRouterStuff } from "@dub/ui";
import { useEffect } from "react";
import { PROGRAMS_PAGE_SIZE, ProgramTab } from "./program-tabs";

// one page of the programs of a tab, with the sort from the URL. The grid and
// the table use the same page size and sort, so a page keeps its programs when
// the partner switches the view.
export function useProgramsPage({
  tab,
  search,
  count,
  includeInactiveDates,
}: {
  tab: ProgramTab;
  search?: string;
  // the number of programs in the tab, when known
  count?: number;
  includeInactiveDates?: boolean;
}) {
  const { searchParams, queryParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination(PROGRAMS_PAGE_SIZE);

  // a page past the end (an old link, or the last invite of a page accepted)
  // has no programs and no footer, so go back to the first page
  useEffect(() => {
    if (
      count &&
      pagination.pageIndex > Math.ceil(count / pagination.pageSize)
    ) {
      queryParams({ del: "page" });
    }
  }, [count, pagination.pageIndex, pagination.pageSize]);

  const sortBy: "name" | undefined =
    searchParams.get("sortBy") === "name" ? "name" : undefined;
  const sortOrder: "asc" | "desc" =
    searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { programEnrollments, isLoading, error } = useProgramEnrollments({
    // only the invite cards and the Invitations table show the rewards and the discount
    includeRewardsDiscounts: tab.id === "invitations",
    includeInactiveDates,
    status: tab.statuses.join(","),
    search,
    ...(sortBy && { sortBy }),
    sortOrder,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  return {
    programEnrollments,
    isLoading,
    error,
    pagination,
    setPagination,
    sortBy,
    sortOrder,
  };
}
