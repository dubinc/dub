"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";

export function ProgramMarketplacePageClient() {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, getQueryString, queryParams } = useRouterStuff();

  // TODO: Fetch programs+counts
  const programs = undefined as any[] | undefined,
    error = undefined,
    countError = undefined,
    isValidating = false;

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
        // TODO: Empty state
        <p>No programs found</p>
      )}
    </div>
  );
}

function ProgramCard({
  program,
}: {
  program?: any; // TODO
}) {
  const { queryParams } = useRouterStuff();

  return (
    <div className={cn(program?.id && "cursor-pointer hover:drop-shadow-sm")}>
      <div className="border-border-subtle rounded-xl border bg-white p-4">
        <div className="flex justify-between gap-4">
          {program ? (
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="size-16 rounded-full"
            />
          ) : (
            <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
          )}
        </div>

        <div className="mt-3.5 flex flex-col gap-3">
          {/* Name */}
          {program ? (
            <span className="text-content-emphasis text-base font-semibold">
              {program.name}
            </span>
          ) : (
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
          )}
        </div>
      </div>
    </div>
  );
}
