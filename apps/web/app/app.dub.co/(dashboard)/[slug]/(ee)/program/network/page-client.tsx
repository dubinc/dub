"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PARTNER_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-network";
import { NetworkPartnerSheet } from "@/ui/partners/partner-network/network-partner-sheet";
import {
  AnimatedSizeContainer,
  Filter,
  PaginationControls,
  Switch,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
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

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    usePartnerNetworkFilters({ status });

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
    <div className="flex flex-col gap-6">
      {detailsSheetState.partnerId && currentPartner && (
        <NetworkPartnerSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentPartner}
          hideNotAFit={variant === "ignored"}
          onPrevious={
            previousPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: previousPartnerId },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: nextPartnerId },
                    scroll: false,
                  })
              : undefined
          }
        />
      )}
      {variant !== "ignored" && (
        <div className="grid grid-cols-3 gap-2">
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
        <div>
          <div className="xs:flex-row xs:items-center flex flex-col gap-4">
            <Filter.Select
              className="h-9 w-full rounded-lg md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
            />
            <label className="flex items-center gap-2">
              <Switch
                checked={searchParams.get("starred") == "true"}
                fn={(checked) => {
                  queryParams({
                    set: checked ? { starred: "true" } : undefined,
                    del: ["page", ...(!checked ? ["starred"] : [])],
                  });
                }}
              />
              <span className="text-content-emphasis text-sm font-medium">
                Starred
              </span>
            </label>
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
        </div>
      )}

      {error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load partners
        </div>
      ) : !partners || partners?.length ? (
        <div>
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
          isFiltered={activeFilters.length > 0}
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
