"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PARTNER_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-network";
import { NetworkPartnerSheet } from "@/ui/partners/partner-network/network-partner-sheet";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import type { PlatformType } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Filter,
  PaginationControls,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { Star, StarFill } from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  NetworkContentSearchResults,
  type PartnerContentSearchResponse,
} from "./network-content-search-results";
import { NetworkEmptyState } from "./network-empty-state";
import { NetworkPartnerCard } from "./network-partner-card";
import { usePartnerNetworkFilters } from "./use-partner-network-filters";

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

const platformFilters = PARTNER_PLATFORM_FIELDS.filter(
  ({ label }) => label !== "Website",
).map(({ label, icon: Icon }) => ({
  label,
  value: label === "X/Twitter" ? "twitter" : label.toLowerCase(),
  icon: Icon,
})) as {
  label: string;
  value: PlatformType;
  icon: Icon;
}[];

const PARTNER_CONTENT_SEARCH_PARTNER_LIMIT = 50;

type ProgramPartnerNetworkPageClientProps = {
  variant?: "default" | "ignored";
};

export function ProgramPartnerNetworkPageClient({
  variant = "default",
}: ProgramPartnerNetworkPageClientProps = {}) {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, getQueryString, queryParams } = useRouterStuff();
  const selectedPlatform = searchParams.get("platform") as PlatformType | null;
  const search = searchParams.get("search")?.trim() ?? "";
  const starred = searchParams.get("starred") === "true";

  const status =
    variant === "ignored"
      ? "ignored"
      : tabs.find(({ id }) => id === searchParams.get("tab"))?.id || "discover";
  const isYouTubeContentSearchMode =
    status === "discover" && selectedPlatform === "youtube";

  const { data: partnerCounts, error: countError } = useNetworkPartnersCount();

  const {
    data: contentSearchResults,
    error: contentSearchError,
    isLoading: isSearchingContent,
  } = useSWR<PartnerContentSearchResponse>(
    workspaceId && isYouTubeContentSearchMode
      ? ["partner-content-search", search, workspaceId, selectedPlatform, starred]
      : null,
    async ([, query]: readonly [
      string,
      string,
      string,
      PlatformType | null,
      boolean,
    ]) => {
      const response = await fetch(
        `/api/network/partners/content-search?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
            chunksPerPartner: 2,
            platform: "youtube",
            starred: starred || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to search partner content");
      }

      return response.json();
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: partners,
    error,
    mutate: mutatePartners,
    isValidating,
  } = useSWR<NetworkPartnerProps[]>(
    !isYouTubeContentSearchMode &&
      workspaceId &&
      `/api/network/partners${getQueryString(
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
      )}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { executeAsync: updateDiscoveredPartner } = useAction(
    updateDiscoveredPartnerAction,
  );

  const { pagination, setPagination } = usePagination(
    PARTNER_NETWORK_MAX_PAGE_SIZE,
  );

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    usePartnerNetworkFilters({ status });
  const nonPlatformFilters = filters.filter(({ key }) => key !== "platform");
  const listedActiveFilters = activeFilters.filter(
    ({ key }) => key !== "platform",
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >({ open: false, partnerId: null });

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (partnerId) setDetailsSheetState({ open: true, partnerId });
  }, [searchParams]);

  const { currentPartner } = useCurrentPartner({
    partners,
    partnerId: detailsSheetState.partnerId,
    partnerListStatus: status,
  });

  const [previousPartnerId, nextPartnerId] = useMemo(() => {
    if (!partners || !detailsSheetState.partnerId) return [null, null];

    const currentIndex = partners.findIndex(
      ({ id }) => id === detailsSheetState.partnerId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? partners[currentIndex - 1].id : null,
      currentIndex < partners.length - 1 ? partners[currentIndex + 1].id : null,
    ];
  }, [partners, detailsSheetState.partnerId]);

  return (
    <div className="flex flex-col">
      {detailsSheetState.partnerId && currentPartner && (
        <NetworkPartnerSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentPartner}
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
          <div className="@3xl/page:flex-row @3xl/page:items-center @3xl/page:justify-between flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Filter.Select
                className="h-9 w-full rounded-lg sm:w-fit"
                filters={nonPlatformFilters}
                activeFilters={listedActiveFilters}
                onSelect={onSelect}
                onRemove={onRemove}
              />
              <PlatformFilterBar
                selectedPlatform={selectedPlatform}
                onSelect={(platform) => {
                  const isActive = selectedPlatform === platform;

                  queryParams({
                    set: isActive ? undefined : { platform },
                    del: ["page", ...(isActive ? ["platform"] : [])],
                  });
                }}
              />
              <StarredFilterButton
                active={searchParams.get("starred") == "true"}
                onClick={() => {
                  const isActive = searchParams.get("starred") == "true";

                  queryParams({
                    set: isActive ? undefined : { starred: "true" },
                    del: ["page", ...(isActive ? ["starred"] : [])],
                  });
                }}
              />
            </div>
            <div className="@3xl/page:w-[373px] w-full">
              <SearchBoxPersisted
                placeholder="Search partners or content..."
                inputClassName="h-9"
              />
            </div>
          </div>
          <AnimatedSizeContainer height>
            {listedActiveFilters.length > 0 && (
              <div className="pt-4">
                <Filter.List
                  filters={nonPlatformFilters}
                  activeFilters={listedActiveFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </AnimatedSizeContainer>
        </div>
      )}

      {isYouTubeContentSearchMode ? (
        <NetworkContentSearchResults
          error={contentSearchError}
          hasQuery={search.length > 0}
          isLoading={isSearchingContent}
          partners={contentSearchResults?.partners}
          onOpenPartner={(partnerId) => {
            queryParams({
              set: { partnerId },
            });
          }}
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
          isFiltered={activeFilters.length > 0 || Boolean(search)}
          isStarred={
            variant === "ignored"
              ? false
              : searchParams.get("starred") == "true"
          }
          onClearAllFilters={onRemoveAll}
          variant={variant === "ignored" ? "ignored" : "default"}
        />
      )}
    </div>
  );
}

function PlatformFilterBar({
  selectedPlatform,
  onSelect,
}: {
  selectedPlatform: PlatformType | null;
  onSelect: (platform: PlatformType) => void;
}) {
  return (
    <div className="border-border-subtle flex h-9 overflow-hidden rounded-lg border bg-white">
      {platformFilters.map(({ label, value, icon: Icon }) => {
        const isActive = selectedPlatform === value;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            aria-label={`Filter by ${label}`}
            className={cn(
              "text-content-subtle hover:bg-bg-muted hover:text-content-emphasis flex size-9 items-center justify-center border-r border-neutral-200 transition-colors last:border-r-0",
              isActive && "bg-bg-muted text-content-emphasis shadow-sm",
            )}
            onClick={() => onSelect(value)}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

function StarredFilterButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label="Show starred partners"
      className={cn(
        "border-border-subtle hover:bg-bg-muted flex size-9 items-center justify-center rounded-lg border bg-white transition-colors",
        active && "border-amber-300 bg-amber-50 text-amber-600",
      )}
      onClick={onClick}
    >
      {active ? (
        <StarFill className="size-4 text-amber-500" />
      ) : (
        <Star className="text-content-subtle size-4" />
      )}
    </button>
  );
}

/** Gets the current partner from the loaded partners array if available, or a separate fetch if not */
function useCurrentPartner({
  partners,
  partnerId,
  partnerListStatus,
}: {
  partners?: NetworkPartnerProps[];
  partnerId: string | null;
  partnerListStatus: string;
}) {
  const { id: workspaceId } = useWorkspace();

  let currentPartner = partnerId
    ? partners?.find(({ id }) => id === partnerId)
    : null;

  const fetchPartnerId = partnerId && !currentPartner ? partnerId : null;

  const { data: fetchedPartners, isLoading } = useSWR<NetworkPartnerProps[]>(
    fetchPartnerId &&
      `/api/network/partners?workspaceId=${workspaceId}&partnerIds=${fetchPartnerId}&status=${partnerListStatus}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  if (!currentPartner && fetchedPartners?.[0]?.id === partnerId)
    currentPartner = fetchedPartners[0];

  return { currentPartner, isLoading };
}
