"use client";

import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { NetworkProgramProps } from "@/lib/types";
import { PROGRAM_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/program-network";
import { PaginationControls, usePagination, useRouterStuff } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { MarketplaceEmptyState } from "../marketplace-empty-state";
import { MarketplaceListToolbar } from "../marketplace-list-toolbar";
import {
  MarketplaceProgramGrid,
  MarketplaceProgramGridSkeleton,
} from "../marketplace-program-grid";
import { useProgramNetworkFilters } from "../use-program-network-filters";
import { getMarketplaceCategoryFromPathname } from "../utils/urls";

export function MarketplaceProgramsListPage() {
  const pathname = usePathname();
  const { getQueryString, searchParamsObj } = useRouterStuff();

  const categoryParam = getMarketplaceCategoryFromPathname(pathname);

  const queryString = getQueryString(
    categoryParam ? { category: categoryParam } : undefined,
  );

  const { data: programsCount, error: countError } = useNetworkProgramsCount({
    query: categoryParam ? { category: categoryParam } : undefined,
  });

  const {
    data: programs,
    error,
    isValidating,
  } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs${queryString}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { pagination, setPagination } = usePagination(
    PROGRAM_NETWORK_MAX_PAGE_SIZE,
  );

  const { activeFilters, onRemoveAll } = useProgramNetworkFilters();

  const hasActiveFilters =
    activeFilters.length > 0 || Boolean(searchParamsObj.search);

  return (
    <div className="flex flex-col gap-4">
      <MarketplaceListToolbar variant="internal" />

      {error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load programs
        </div>
      ) : !programs || programs?.length ? (
        <div>
          <div className="min-h-[300px]">
            {programs ? (
              <MarketplaceProgramGrid
                programs={programs}
                className={cn(isValidating && "opacity-50")}
              />
            ) : (
              <MarketplaceProgramGridSkeleton />
            )}
          </div>
          <div className="sticky bottom-0 mt-4 rounded-b-[inherit] border-t border-neutral-200 bg-white px-3.5 py-2">
            <PaginationControls
              pagination={pagination}
              setPagination={setPagination}
              totalCount={programsCount || 0}
              unit={(p) => `program${p ? "s" : ""}`}
            />
          </div>
        </div>
      ) : (
        <MarketplaceEmptyState
          isFiltered={hasActiveFilters}
          onClearAllFilters={onRemoveAll}
        />
      )}
    </div>
  );
}
