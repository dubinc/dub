"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import { parseReachTiers } from "@/lib/api/network/reach-tiers";
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
import { PlatformType } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import useSWR from "swr";
import { NetworkContentSearchResults } from "./network-content-search-results";
import { NetworkEmptyState } from "./network-empty-state";
import { NetworkPartnerCard } from "./network-partner-card";
import { NetworkPartnerDetailSheet } from "./network-partner-detail-sheet";
import { NetworkPlatformFilter } from "./network-platform-filter";
import {
  getContentSearchPlatforms,
  isAllPlatformsSelected,
  parseSelectedPlatforms,
  platformFilterParam,
} from "./platform-filter-utils";
import { usePartnerNetworkFilters } from "./use-partner-network-filters";

// Filter changes update the URL instantly (snappy controls) but the data fetch is
// debounced so a rapid burst of toggles collapses into a single request — sparing
// the heavy ranking SQL and (in search mode) the billed Voyage embed+rerank call.
// keepPreviousData holds the prior results on screen during the brief wait.
const FILTER_FETCH_DEBOUNCE_MS = 250;

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
  const selectedPlatforms = useMemo(
    () => parseSelectedPlatforms(searchParams.get("platform")),
    [searchParams],
  );
  const platformFilter = platformFilterParam(selectedPlatforms);
  // The content-searchable subset of the selection. Semantic search runs only
  // when at least one searchable platform is selected; otherwise we fall back to
  // the ranked partner list (filtered to the chosen platforms).
  const contentSearchPlatforms = getContentSearchPlatforms(selectedPlatforms);
  const selectedReach = useMemo(
    () => parseReachTiers(searchParams.get("reach")),
    [searchParams],
  );
  const reachFilter = selectedReach.length ? selectedReach : undefined;
  const search = searchParams.get("search")?.trim() ?? "";
  const country = searchParams.get("country") ?? undefined;
  const starred = searchParams.get("starred") === "true";

  const status =
    variant === "ignored"
      ? "ignored"
      : tabs.find(({ id }) => id === searchParams.get("tab"))?.id || "discover";
  const isContentSearchMode =
    status === "discover" &&
    search.length > 0 &&
    contentSearchPlatforms.length > 0;

  // Update filter params via the History API instead of router.push. These are
  // query-only changes that drive client-side SWR; page.tsx reads no searchParams,
  // so a full RSC navigation per click only adds latency before useSearchParams()
  // (and thus the control's checked state) updates. pushState updates it
  // synchronously — instant feedback — while SWR still refetches on key change.
  const updateSearchParams = (opts: {
    set?: Record<string, string | string[]>;
    del?: string | string[];
  }) => {
    const newPath = queryParams({ ...opts, getNewPath: true }) as string;
    window.history.pushState(null, "", newPath);
  };

  const onPlatformsChange = (platforms: PlatformType[]) =>
    updateSearchParams(
      isAllPlatformsSelected(platforms)
        ? { del: ["platform", "page"] }
        : { set: { platform: platforms.join(",") }, del: "page" },
    );

  const { data: partnerCounts, error: countError } = useNetworkPartnersCount();

  const {
    data: contentSearchResults,
    error: contentSearchError,
    isLoading: isSearchingContent,
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

  const { executeAsync: updateDiscoveredPartner } = useAction(
    updateDiscoveredPartnerAction,
  );

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

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >(
    selectedPartnerId
      ? { open: true, partnerId: selectedPartnerId }
      : { open: false, partnerId: null },
  );

  useEffect(() => {
    if (selectedPartnerId) {
      setDetailsSheetState({ open: true, partnerId: selectedPartnerId });
    } else {
      setDetailsSheetState({ open: false, partnerId: null });
    }
  }, [selectedPartnerId]);

  const sheetPartnerIds = useMemo(
    () =>
      isContentSearchMode
        ? contentSearchResults?.partners.map(({ partnerId }) => partnerId)
        : partners?.map(({ id }) => id),
    [contentSearchResults?.partners, isContentSearchMode, partners],
  );

  const [previousPartnerId, nextPartnerId] = useMemo(() => {
    if (!sheetPartnerIds?.length || !detailsSheetState.partnerId) {
      return [null, null];
    }

    const currentIndex = sheetPartnerIds.findIndex(
      (id) => id === detailsSheetState.partnerId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? sheetPartnerIds[currentIndex - 1] : null,
      currentIndex < sheetPartnerIds.length - 1
        ? sheetPartnerIds[currentIndex + 1]
        : null,
    ];
  }, [detailsSheetState.partnerId, sheetPartnerIds]);

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
            <div className="@3xl/page:ml-auto @3xl/page:w-[373px] w-full">
              <SearchBoxPersisted
                placeholder="Search partners or content..."
                inputClassName="h-10"
              />
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
          isLoading={isSearchingContent}
          partners={contentSearchResults?.partners}
          platform={
            contentSearchPlatforms.length === 1
              ? contentSearchPlatforms[0]
              : undefined
          }
          onToggleStarred={
            variant === "ignored"
              ? undefined
              : (partnerId, starred) => {
                  mutateContentSearch(
                    // @ts-ignore SWR doesn't seem to have proper typing for partial data results w/ `populateCache`
                    async () => {
                      const result = await updateDiscoveredPartner({
                        workspaceId: workspaceId!,
                        partnerId,
                        starred,
                      });
                      if (!result?.data) {
                        toast.error("Failed to star partner");
                        throw new Error("Failed to star partner");
                      }

                      return result.data;
                    },
                    {
                      optimisticData: (data) =>
                        data && {
                          ...data,
                          partners: data.partners.map((p) =>
                            p.partnerId === partnerId
                              ? {
                                  ...p,
                                  partner: {
                                    ...p.partner,
                                    starredAt: starred ? new Date() : null,
                                  },
                                }
                              : p,
                          ),
                        },
                      populateCache: (
                        result: { starredAt: Date | null },
                        data,
                      ) =>
                        data && {
                          ...data,
                          partners: data.partners.map((p) =>
                            p.partnerId === partnerId
                              ? {
                                  ...p,
                                  partner: {
                                    ...p.partner,
                                    starredAt: result.starredAt,
                                  },
                                }
                              : p,
                          ),
                        },
                      revalidate: false,
                    },
                  );
                }
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
                        : (starred) => {
                            mutatePartners(
                              // @ts-ignore SWR doesn't seem to have proper typing for partial data results w/ `populateCache`
                              async () => {
                                const result = await updateDiscoveredPartner({
                                  workspaceId: workspaceId!,
                                  partnerId: partner.id,
                                  starred,
                                });
                                if (!result?.data) {
                                  toast.error("Failed to star partner");
                                  throw new Error("Failed to star partner");
                                }

                                return result.data;
                              },
                              {
                                optimisticData: (data) =>
                                  (data || partners).map((p) =>
                                    p.id === partner.id
                                      ? {
                                          ...p,
                                          starredAt: starred
                                            ? new Date()
                                            : null,
                                        }
                                      : p,
                                  ),
                                populateCache: (
                                  result: { starredAt: Date | null },
                                  data,
                                ) =>
                                  (data || partners).map((p) =>
                                    p.id === partner.id
                                      ? { ...p, starredAt: result.starredAt }
                                      : p,
                                  ),
                                revalidate: false,
                              },
                            );
                          }
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
