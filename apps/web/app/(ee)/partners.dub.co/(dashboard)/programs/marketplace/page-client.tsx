"use client";

import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { NetworkProgramProps } from "@/lib/types";
import { PROGRAM_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/program-network";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Filter,
  PaginationControls,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import useSWR from "swr";
import { MarketplaceEmptyState } from "./marketplace-empty-state";
import { FeaturedProgramCard, ProgramCard } from "./program-card";
import ProgramSort from "./program-sort";
import { useProgramNetworkFilters } from "./use-program-network-filters";

export function ProgramMarketplacePageClient() {
  const { getQueryString } = useRouterStuff();

  const { data: programsCount, error: countError } = useNetworkProgramsCount();

  const {
    data: programs,
    error,
    isValidating,
  } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs${getQueryString({
      //
    })}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { pagination, setPagination } = usePagination(
    PROGRAM_NETWORK_MAX_PAGE_SIZE,
  );

  const {
    filters,
    activeFilters,
    isFiltered,
    onSelect,
    onRemove,
    onRemoveAll,
  } = useProgramNetworkFilters();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-content-emphasis text-base font-semibold">
          Featured programs
        </h2>
        <div className="@3xl/page:grid-cols-2 mt-4 grid grid-cols-1 gap-4">
          <FeaturedProgramCard program={programs?.[0]} />
          <FeaturedProgramCard program={programs?.[1]} />
        </div>
      </div>
      <div>
        <div className="xs:flex-row xs:items-center flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter.Select
              className="h-9 w-full rounded-lg md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
            />
            <ProgramSort />
          </div>
          <SearchBoxPersisted
            placeholder="Search the marketplace..."
            inputClassName="md:w-[19rem] h-9 rounded-lg"
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            <div className={cn("pt-3", !isFiltered && "hidden")}>
              <Filter.List
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onRemoveAll={onRemoveAll}
              />
            </div>
          </div>
        </AnimatedSizeContainer>
      </div>

      {error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load programs
        </div>
      ) : !programs || programs?.length ? (
        <div>
          <div
            className={cn(
              "@4xl/page:grid-cols-3 @xl/page:grid-cols-2 grid min-h-[500px] grid-cols-1 items-start gap-4 transition-opacity lg:gap-6",
              isValidating && "opacity-50",
            )}
          >
            {programs
              ? programs?.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))
              : [...Array(5)].map((_, idx) => <ProgramCard key={idx} />)}
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
          isFiltered={isFiltered}
          onClearAllFilters={onRemoveAll}
        />
      )}
    </div>
  );
}
