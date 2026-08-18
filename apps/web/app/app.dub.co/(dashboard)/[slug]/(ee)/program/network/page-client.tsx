"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PARTNER_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-network";
import { NetworkPartnerSheet } from "@/ui/partners/partner-network/network-partner-sheet";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  PaginationControls,
  ToggleGroup,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import {
  Globe,
  Instagram,
  LinkedIn,
  Star,
  TikTok,
  Twitter,
  User,
  YouTube,
} from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { NetworkEmptyState } from "./network-empty-state";
import { NetworkPartnerCard } from "./network-partner-card";
import { PartnerNetworkSort } from "./partner-network-sort";
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

const PLATFORM_TOGGLE_OPTIONS: {
  value: PlatformType | "all";
  icon: typeof User;
}[] = [
  { value: "all", icon: User },
  { value: "website", icon: Globe },
  { value: "youtube", icon: YouTube },
  { value: "twitter", icon: Twitter },
  { value: "linkedin", icon: LinkedIn },
  { value: "instagram", icon: Instagram },
  { value: "tiktok", icon: TikTok },
];

type ProgramPartnerNetworkPageClientProps = {
  variant?: "default" | "ignored";
};

export function ProgramPartnerNetworkPageClient({
  variant = "default",
}: ProgramPartnerNetworkPageClientProps = {}) {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, getQueryString, queryParams } = useRouterStuff();

  const status =
    variant === "ignored"
      ? "ignored"
      : tabs.find(({ id }) => id === searchParams.get("tab"))?.id || "discover";

  const { data: partnerCounts, error: countError } = useNetworkPartnersCount();

  const {
    data: partners,
    error,
    mutate: mutatePartners,
    isValidating,
  } = useSWR<NetworkPartnerProps[]>(
    workspaceId &&
      `/api/network/partners${getQueryString(
        {
          workspaceId,
          status,
        },
        {
          exclude:
            variant === "ignored"
              ? ["tab", "partnerId", "starred"]
              : ["tab", "partnerId"],
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

  const {
    filters,
    activeFilters,
    isFiltered,
    onSelect,
    onRemove,
    onRemoveAll,
  } = usePartnerNetworkFilters({ status });

  const isStarred = searchParams.get("starred") === "true";
  const selectedPlatform =
    (searchParams.get("platform") as PlatformType | null) ?? "all";

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
                    del: ["page", "starred", "sortBy"],
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
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Filter.Select
                className="h-10 w-full shrink-0 rounded-lg md:w-fit"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
              />
              <div className="flex items-center gap-4">
                <ToggleGroup
                  className="h-10 w-full rounded-lg border-neutral-200 bg-neutral-50 p-0 md:w-fit"
                  optionClassName="rounded-lg px-3 py-2.5"
                  indicatorClassName="rounded-lg bg-white border-none shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_3px_0_rgba(0,0,0,0.08)]"
                  options={PLATFORM_TOGGLE_OPTIONS.map(
                    ({ value, icon: Icon }) => ({
                      value,
                      label: <Icon className="size-4" />,
                    }),
                  )}
                  selected={selectedPlatform}
                  selectAction={(option) => {
                    if (option === "all") {
                      queryParams({
                        del: ["platform", "page"],
                      });
                    } else {
                      queryParams({
                        set: { platform: option },
                        del: "page",
                      });
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    queryParams({
                      set: !isStarred ? { starred: "true" } : undefined,
                      del: ["page", ...(!isStarred ? [] : ["starred"])],
                    });
                  }}
                  icon={
                    isStarred ? (
                      <Star variant="fill" className="size-4 text-amber-500" />
                    ) : (
                      <Star className="text-content-subtle size-4" />
                    )
                  }
                  className="size-10 shrink-0 rounded-lg"
                />
              </div>
            </div>
            <PartnerNetworkSort
              selectedPlatform={selectedPlatform}
              className="md:ml-auto"
            />
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

      {error || countError ? (
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
        />
      )}
    </div>
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

  const fetchPartnerId =
    partners && partnerId && !currentPartner ? partnerId : null;

  const { data: fetchedPartners, isLoading } = useSWR<NetworkPartnerProps>(
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
