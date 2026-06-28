"use client";

import { PARTNER_CONTENT_SEARCH_DETAIL_CHUNKS_PER_PARTNER } from "@/lib/partner-content-search/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerContentSearch, {
  type PartnerContentSearchPartner,
} from "@/lib/swr/use-partner-content-search";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PartnerAbout } from "@/ui/partners/partner-about";
import { PartnerComments } from "@/ui/partners/partner-comments";
import { PartnerInfoCards } from "@/ui/partners/partner-info-cards";
import { PartnerSheetTabs } from "@/ui/partners/partner-sheet-tabs";
import { fetcher } from "@dub/utils";
import Link from "next/link";
import {
  getContentSearchPlatforms,
  parseSelectedPlatforms,
  platformFilterParam,
} from "../platform-filter-utils";
import { NetworkInviteControl } from "./network-invite-control";
import { RecentContentPanel } from "./recent-content-panel";
import { SearchFitPanel } from "./search-fit-panel";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

export function NetworkPartnerDetailPageClient({
  partnerId,
}: {
  partnerId: string;
}) {
  return (
    <NetworkPartnerDetailContent
      partnerId={partnerId}
      partnerStatus="discover"
      showBackLink
    />
  );
}

export function NetworkPartnerDetailContent({
  partnerId,
  partnerStatus,
  searchPartner: initialSearchPartner,
  showBackLink = false,
  nestedSheets = false,
}: {
  partnerId: string;
  partnerStatus: string;
  searchPartner?: PartnerContentSearchPartner;
  showBackLink?: boolean;
  nestedSheets?: boolean;
}) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [currentTabId, setCurrentTabId] = useState<string>("about");
  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.trim() ?? "";
  const country = searchParams.get("country") ?? undefined;
  const selectedPlatforms = parseSelectedPlatforms(
    searchParams.get("platform"),
  );
  const contentSearchPlatforms = getContentSearchPlatforms(selectedPlatforms);
  const hasContentSearch =
    search.length > 0 && contentSearchPlatforms.length > 0;
  const backHref = workspaceSlug
    ? `/${workspaceSlug}/program/network${getBackQueryString(searchParams)}`
    : "#";

  // Skip standalone partner fetch on cold deep-link only — otherwise we'd re-run ranking SQL.
  const hasInitialPartner = Boolean(initialSearchPartner?.partner);
  const { data: partners, isLoading: isLoadingPartner } = useSWR<
    NetworkPartnerProps[]
  >(
    workspaceId && !hasInitialPartner
      ? getPartnerApiPath({ workspaceId, partnerStatus, partnerId, country })
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const loadedPartner = partners?.[0];

  // Background scoped rerank puts every row on one relevance scale.
  const shouldFetchSearch = hasContentSearch;
  const {
    data: searchResults,
    error: searchError,
    isLoading: isLoadingSearch,
  } = usePartnerContentSearch({
    enabled: Boolean(workspaceId && shouldFetchSearch),
    query: search,
    platforms: platformFilterParam(selectedPlatforms),
    country,
    starred: false,
    partnerIds: [partnerId],
    limit: 1,
    chunksPerPartner: PARTNER_CONTENT_SEARCH_DETAIL_CHUNKS_PER_PARTNER,
  });

  const {
    data: recentResults,
    error: recentError,
    isLoading: isLoadingRecent,
  } = usePartnerContentSearch({
    // Always loaded: drives the no-search panel and the search panel's "All recent
    // content" section. No-query path → a DB read, not a billed Voyage call.
    enabled: Boolean(workspaceId),
    query: "",
    country,
    starred: false,
    partnerIds: [partnerId],
    limit: 1,
    chunksPerPartner: PARTNER_CONTENT_SEARCH_DETAIL_CHUNKS_PER_PARTNER,
  });
  const recentPartner = recentResults?.partners?.[0];

  const fetchedPartner = searchResults?.partners?.[0];
  const partner =
    initialSearchPartner?.partner ??
    loadedPartner ??
    fetchedPartner?.partner ??
    recentPartner?.partner;
  // Chunks prefer the fuller fetched set; the summary keeps the cached one so scores don't drift.
  const searchPartner = fetchedPartner ?? initialSearchPartner;
  const searchSummary =
    initialSearchPartner?.matchSummary ?? fetchedPartner?.matchSummary;
  // Relevance is sourced from the scoped fetch's chunks on a single scale (rerank,
  // or cosine when the reranker failed) — never blended.
  const reranked = searchResults?.reranked ?? false;
  // Deep-link with nothing cached → full skeleton; otherwise a silent refinement.
  const isFallbackLoading = isLoadingSearch && !initialSearchPartner;
  const isRefiningRelevance =
    isLoadingSearch && Boolean(initialSearchPartner) && !fetchedPartner;

  if (!isLoadingPartner && !partner) {
    return (
      <div className="flex flex-col gap-6">
        {showBackLink && (
          <Link
            href={backHref}
            className="text-content-default hover:text-content-emphasis flex w-fit items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to results
          </Link>
        )}
        <section className="border-border-subtle rounded-xl border bg-white p-8 text-sm text-neutral-600">
          Partner not found in the network results.
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showBackLink && (
        <Link
          href={backHref}
          className="text-content-default hover:text-content-emphasis flex w-fit items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to results
        </Link>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="lg:order-2">
          <PartnerInfoCards
            type="network"
            partner={partner}
            browseMode
            hideStatuses={["pending"]}
            showFraudIndicator={false}
            controls={
              partner ? (
                <NetworkInviteControl
                  partner={partner}
                  nested={nestedSheets}
                  onSuccess={() => mutatePrefix("/api/network/partners")}
                />
              ) : undefined
            }
          />
        </div>

        <div className="lg:order-1">
          <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
            <PartnerSheetTabs
              partnerId={partnerId}
              currentTabId={currentTabId}
              setCurrentTabId={setCurrentTabId}
              aboutLabel="Content"
            />
            <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
              {currentTabId === "about" && (
                <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
                  <PartnerAbout
                    partner={partner}
                    hideSocials
                    hideDescription
                    hideMonthlyTraffic
                  />
                  {hasContentSearch ? (
                    <SearchFitPanel
                      error={searchError}
                      isLoading={isFallbackLoading}
                      isRefining={isRefiningRelevance}
                      query={search}
                      summary={searchSummary}
                      reranked={reranked}
                      searchPartner={searchPartner}
                      recentChunks={recentPartner?.chunks}
                      recentLoading={isLoadingRecent}
                      recentError={recentError}
                    />
                  ) : (
                    <RecentContentPanel
                      partner={partner}
                      searchPartner={recentPartner}
                      isLoading={isLoadingRecent}
                      error={recentError}
                    />
                  )}
                </div>
              )}
              {currentTabId === "comments" && (
                <div>
                  <h3 className="text-content-emphasis text-lg font-semibold">
                    Comments
                  </h3>
                  <PartnerComments partnerId={partnerId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getBackQueryString(searchParams: { toString(): string }) {
  const params = new URLSearchParams(searchParams.toString());
  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function getPartnerApiPath({
  workspaceId,
  partnerStatus,
  partnerId,
  country,
}: {
  workspaceId: string;
  partnerStatus: string;
  partnerId: string;
  country?: string;
}) {
  const params = new URLSearchParams({
    workspaceId,
    status: partnerStatus,
    partnerIds: partnerId,
    pageSize: "1",
  });

  if (country) params.set("country", country);

  return `/api/network/partners?${params}`;
}
