"use client";

import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { NetworkProgramProps } from "@/lib/types";
import { Link4, useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL, cn, fetcher, getPrettyUrl } from "@dub/utils";
import useSWR from "swr";
import { MarketplaceEmptyState } from "./marketplace-empty-state";

export function ProgramMarketplacePageClient() {
  const { searchParams, getQueryString, queryParams } = useRouterStuff();

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

  // TODO: Pagination+filters

  return (
    <div className="flex flex-col gap-6">
      {/* <div>
        <div className="xs:flex-row xs:items-center flex flex-col gap-4">
          <Filter.Select
            className="h-9 w-full rounded-lg md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
      </div> */}

      {error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load programs
        </div>
      ) : !programs || programs?.length ? (
        <div>
          <div
            className={cn(
              "@3xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 transition-opacity lg:gap-6",
              isValidating && "opacity-50",
            )}
          >
            {programs
              ? programs?.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))
              : [...Array(8)].map((_, idx) => <ProgramCard key={idx} />)}
          </div>
          {/* <div className="sticky bottom-0 mt-4 rounded-b-[inherit] border-t border-neutral-200 bg-white px-3.5 py-2">
            <PaginationControls
              pagination={pagination}
              setPagination={setPagination}
              totalCount={partnerCounts?.[status] || 0}
              unit={(p) => `partner${p ? "s" : ""}`}
            />
          </div> */}
        </div>
      ) : (
        <MarketplaceEmptyState
          isFiltered={false} // TODO
          onClearAllFilters={() => {}} // TODO
        />
      )}
    </div>
  );
}

function ProgramCard({
  program,
}: {
  program?: any; // TODO
}) {
  return (
    <div className={cn(program?.id && "cursor-pointer hover:drop-shadow-sm")}>
      <div className="border-border-subtle rounded-xl border bg-white p-6">
        <div className="flex justify-between gap-4">
          {program ? (
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="size-12 rounded-full"
            />
          ) : (
            <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
          )}

          {/* TODO: Status */}
        </div>

        <div className="mt-4 flex flex-col">
          {/* Name */}
          {program ? (
            <span className="text-content-emphasis text-base font-semibold">
              {program.name}
            </span>
          ) : (
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
          )}

          <div className="text-content-default mt-1 flex items-center gap-1">
            <Link4 className="size-3.5" />
            {/* Domain */}
            {program ? (
              <a
                href={program.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-medium"
              >
                {getPrettyUrl(program.url)}
              </a>
            ) : (
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
            )}
          </div>

          <div className="mt-4 flex gap-8">
            <div>
              <span className="text-content-subtle text-xs font-medium">
                Rewards
              </span>
            </div>
            <div>
              <span className="text-content-subtle text-xs font-medium">
                Industry
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
