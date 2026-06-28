"use client";

import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import usePartnerContentSearch from "@/lib/swr/use-partner-content-search";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PARTNER_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-network";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  PaginationControls,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import { Star, StarFill } from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import useSWR from "swr";
import { useDebounce } from "use-debounce";
import { NetworkContentSearchResults } from "./network-content-search-results";
import { NetworkEmptyState } from "./network-empty-state";
import { NetworkPartnerCard } from "./network-partner-card";
import { NetworkPartnerDetailSheet } from "./network-partner-detail-sheet";
import { NetworkPlatformFilter } from "./network-platform-filter";
import { useNetworkDetailSheet } from "./use-network-detail-sheet";
import {
  FILTER_FETCH_DEBOUNCE_MS,
  useNetworkPartnerFiltersState,
} from "./use-network-partner-filters-state";
import { usePartnerNetworkFilters } from "./use-partner-network-filters";
import {
  useToggleStarredContentSearch,
  useToggleStarredRankedList,
} from "./use-toggle-partner-starred";

const tabs = [
  {
    label: "Discover",
    id: "discover",
  },
  {
    label: "Invited",
    id: "invited",
  },
  {
    label: "Recruited",
    id: "recruited",
  },
] as const;

type ProgramPartnerNetworkPageClientProps = {
  variant?: "default" | "ignored";
};

export function ProgramPartnerNetworkPageClient({
  variant = "default",
}: ProgramPartnerNetworkPageClientProps = {}) {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, getQueryString, queryParams } = useRouterStuff();

  const {
    selectedPlatforms,
    platformFilter,
    contentSearchPlatforms,
    reachFilter,
    search,
    country,
    starred,
    updateSearchParams,
    onPlatformsChange,
  } = useNetworkPartnerFiltersState();

  const status =
    variant === "ignored"
      ? "ignored"
      : tabs.find(({ id }) => id === searchParams.get("tab"))?.id || "discover";
  const isContentSearchMode =
    status === "discover" &&
    search.length > 0 &&
    contentSearchPlatforms.length > 0;

  const { data: partnerCounts, error: countError } = useNetworkPartnersCount();

  const {
    data: contentSearchResults,
    error: contentSearchError,
    isPending: isContentSearchPending,
    mutate: mutateContentSearch,
  } = usePartnerContentSearch({
    enabled: isContentSearchMode,
    query: search,
    platforms: platformFilter,
    reach: reachFilter,
    country,
    starred,
    debounceMs: FILTER_FETCH_DEBOUNCE_MS,
  });

  const partnersKey =
    !isContentSearchMode && workspaceId
      ? `/api/network/partners${getQueryString(
          {
            workspaceId,
            status,
          },
          {
            exclude:
              variant === "ignored"
                ? ["tab", "partnerId", "starred", "search"]
                : ["tab", "partnerId", "search"],
          },
        )}`
      : null;
  // Debounce the fetch key so rapid filter toggles coalesce into one request.
  const [debouncedPartnersKey] = useDebounce(
    partnersKey,
    FILTER_FETCH_DEBOUNCE_MS,
  );

  const {
    data: partners,
    error,
    mutate: mutatePartners,
    isValidating,
  } = useSWR<NetworkPartnerProps[]>(debouncedPartnersKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const { pagination, setPagination } = usePagination(
    PARTNER_NETWORK_MAX_PAGE_SIZE,
  );

  const {
    filters,
    activeFilters,
    isFiltered,
    onSelect,
    onRemove,
    onRemoveAll,
  } = usePartnerNetworkFilters({ status });

  const isStarred = searchParams.get("starred") === "true";
  const selectedPartnerId = searchParams.get("partnerId");

  const {
    detailsSheetState,
    setDetailsSheetState,
    previousPartnerId,
    nextPartnerId,
  } = useNetworkDetailSheet({
    selectedPartnerId,
    isContentSearchMode,
    contentSearchPartners: contentSearchResults?.partners,
    partners,
  });

  const toggleStarredContentSearch =
    useToggleStarredContentSearch(mutateContentSearch);
  const toggleStarredRankedList = useToggleStarredRankedList(
    mutatePartners,
    partners,
  );

  return (
    <div className="flex flex-col">
      {detailsSheetState.partnerId && (
        <NetworkPartnerDetailSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((state) =>
              open && state.partnerId
                ? { open: true, partnerId: state.partnerId }
                : { open: false, partnerId: state.partnerId },
            )
          }
          partnerId={detailsSheetState.partnerId}
          partnerStatus={status}
          searchPartner={contentSearchResults?.partners.find(
            ({ partnerId }) => partnerId === detailsSheetState.partnerId,
          )}
          onPrevious={
            previousPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: previousPartnerId },
                  })
              : undefined
          }
          onNext={
            nextPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: nextPartnerId },
                  })
              : undefined
          }
        />
      )}

      {variant !== "ignored" && (
        <div className="mt-px grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const isActive = status === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "border-border-subtle flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-100",
                  isActive
                    ? "border-black ring-1 ring-black"
                    : "hover:bg-bg-muted",
                )}
                onClick={() => {
                  queryParams({
                    set: { tab: tab.id },
                    del: ["page", "starred"],
                  });
                }}
              >
                <span className="text-content-default text-xs font-semibold">
                  {tab.label}
                </span>
                {partnerCounts ? (
                  <span className="text-content-emphasis text-base font-semibold">
                    {(partnerCounts?.[tab.id] || 0).toLocaleString()}
                  </span>
                ) : (
                  <div className="h-6 w-12 animate-pulse rounded-md bg-neutral-200" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {status === "discover" && (
        <div className="mt-[17px]">
          <div className="@3xl/page:flex-row @3xl/page:items-center flex flex-col gap-3">
            <div className="flex flex-col items-center gap-3 md:flex-row">
              <Filter.Select
                className="h-10 w-full shrink-0 rounded-lg md:w-fit"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  updateSearchParams({
                    set: !isStarred ? { starred: "true" } : undefined,
                    del: ["page", ...(!isStarred ? [] : ["starred"])],
                  });
                }}
                icon={
                  isStarred ? (
                    <StarFill className="size-4 text-amber-500" />
                  ) : (
                    <Star className="text-content-subtle size-4" />
                  )
                }
                className="size-10 shrink-0 rounded-lg"
              />
              <NetworkPlatformFilter
                selectedPlatforms={selectedPlatforms}
                onChange={onPlatformsChange}
              />
            </div>
            <div className="@3xl/page:ml-auto @3xl/page:w-auto flex w-full items-center gap-2">
              <div className="@3xl/page:w-[373px] w-full">
                <SearchBoxPersisted
                  placeholder="Search by Topic, Keyword, or Competitor"
                  inputClassName="h-10"
                  loading={isContentSearchMode && isContentSearchPending}
                />
              </div>
            </div>
          </div>
          <AnimatedSizeContainer height>
            {activeFilters.length > 0 && (
              <div className="pt-4">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </AnimatedSizeContainer>
        </div>
      )}

      {isContentSearchMode ? (
        <NetworkContentSearchResults
          error={contentSearchError}
          hasQuery={search.length > 0}
          isFetching={isContentSearchPending}
          partners={contentSearchResults?.partners}
          platform={
            contentSearchPlatforms.length === 1
              ? contentSearchPlatforms[0]
              : undefined
          }
          onToggleStarred={
            variant === "ignored" ? undefined : toggleStarredContentSearch
          }
        />
      ) : error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load partners
        </div>
      ) : !partners || partners?.length ? (
        <div className="mt-4">
          <div
            className={cn(
              "@5xl/page:grid-cols-4 @3xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 transition-opacity lg:gap-6",
              isValidating && "opacity-50",
            )}
          >
            {partners
              ? partners?.map((partner) => (
                  <NetworkPartnerCard
                    key={partner.id}
                    partner={partner}
                    onToggleStarred={
                      variant === "ignored"
                        ? undefined
                        : (starred) =>
                            toggleStarredRankedList(partner.id, starred)
                    }
                  />
                ))
              : [...Array(12)].map((_, idx) => (
                  <NetworkPartnerCard key={idx} />
                ))}
          </div>
          <div className="sticky bottom-0 mt-4 rounded-b-[inherit] border-t border-neutral-200 bg-white px-3.5 py-2">
            <PaginationControls
              pagination={pagination}
              setPagination={setPagination}
              totalCount={
                variant === "ignored"
                  ? partnerCounts?.ignored
                  : partnerCounts?.[status]
              }
              unit={(p) => `partner${p ? "s" : ""}`}
            />
          </div>
        </div>
      ) : (
        <NetworkEmptyState
          isFiltered={isFiltered}
          isStarred={variant === "ignored" ? false : isStarred}
          onClearAllFilters={onRemoveAll}
          variant={variant === "ignored" ? "ignored" : "default"}
        />
      )}
    </div>
  );
}
