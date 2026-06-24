"use client";

import {
  PARTNER_CONTENT_SEARCH_TOP_CONTENT,
  type PartnerContentTopicFitBand,
} from "@/lib/partner-content-search/constants";
import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { Button } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { useState } from "react";
import { contentNoun, lastPostedLabel } from "../content-display-utils";
import {
  ContentMatchRow,
  ContentMatchSkeletons,
  formatRankWindowPhrase,
} from "./content-match-row";
import { CoverageSummaryBar } from "./coverage-summary-bar";
import {
  buildMatchedContentItems,
  buildUnifiedRelevanceMap,
  DETAIL_CONTENT_INITIAL_DISPLAY_COUNT,
  DETAIL_CONTENT_PAGE_COUNT,
  publishedAtMs,
} from "./search-fit-utils";

const BAND_HEADLINE: Record<PartnerContentTopicFitBand, string> = {
  consistent: "Consistently posts about this",
  frequent: "Frequently posts about this",
  occasional: "Occasionally posts about this",
  "one-off": "Posted about this once",
  none: "No recent posts about this",
};

const TOPIC_FIT_BAND_CHIP: Record<PartnerContentTopicFitBand, string> = {
  consistent: "bg-green-50 text-green-700",
  frequent: "bg-blue-50 text-blue-700",
  occasional: "bg-amber-50 text-amber-700",
  "one-off": "bg-neutral-100 text-neutral-600",
  none: "bg-neutral-100 text-neutral-500",
};

const MAX_QUERY_DISPLAY_LENGTH = 60;

// The search box is natural-language, so a long query would wrap the headline. Trim
// to a tidy length for inline display — the full query still drives the search.
function truncateQuery(query: string) {
  const trimmed = query.trim();
  return trimmed.length > MAX_QUERY_DISPLAY_LENGTH
    ? `${trimmed.slice(0, MAX_QUERY_DISPLAY_LENGTH).trimEnd()}…`
    : trimmed;
}

export function SearchFitPanel({
  error,
  isLoading,
  isRefining = false,
  query,
  summary: initialSummary,
  relevanceSummary,
  searchPartner,
}: {
  error: unknown;
  isLoading: boolean;
  isRefining?: boolean;
  query?: string;
  summary?: PartnerContentSearchPartner["matchSummary"];
  relevanceSummary?: PartnerContentSearchPartner["matchSummary"] | null;
  searchPartner?: PartnerContentSearchPartner;
}) {
  const [visibleAllCount, setVisibleAllCount] = useState(
    DETAIL_CONTENT_INITIAL_DISPLAY_COUNT,
  );
  const summary = initialSummary ?? searchPartner?.matchSummary;

  if (isLoading && !summary) {
    return <SearchFitPanelSkeleton />;
  }

  const isLoadingRows = isLoading || isRefining;
  const unifiedRelevanceByItemId = buildUnifiedRelevanceMap(relevanceSummary);
  // Hold rows until scoped rerank lands so scores/order don't swap in.
  const items = buildMatchedContentItems(
    summary,
    isLoadingRows ? [] : (searchPartner?.chunks ?? []),
    unifiedRelevanceByItemId,
  );

  const topContent = [...items]
    .sort((a, b) => b.blendedScore - a.blendedScore)
    .slice(0, PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount);
  const allContent = [...items].sort(
    (a, b) => publishedAtMs(b.publishedAt) - publishedAtMs(a.publishedAt),
  );
  const visibleAll = allContent.slice(0, visibleAllCount);
  const hiddenAllCount = Math.max(0, allContent.length - visibleAll.length);
  // "All content" only earns its place when it adds rows beyond the top set.
  const showAllSection =
    !isLoadingRows &&
    allContent.length > PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount;

  const band = summary?.band ?? "none";
  const lastOnTopic = lastPostedLabel(summary?.lastOnTopicAt ?? null);
  const metaParts = [
    summary?.followers ? `${nFormatter(summary.followers)} followers` : null,
    summary?.medianViews
      ? `${nFormatter(summary.medianViews)} median views`
      : null,
    lastOnTopic ? `last published ${lastOnTopic}` : null,
  ].filter((part): part is string => Boolean(part));
  const rankWindowPhrase = formatRankWindowPhrase(summary);
  const topContentCaption = rankWindowPhrase
    ? `Ranked by relevance + reach across ${rankWindowPhrase}.`
    : "Ranked by relevance + reach.";

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-content-emphasis text-lg font-semibold">
              {BAND_HEADLINE[band]}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                TOPIC_FIT_BAND_CHIP[band],
              )}
            >
              Topic fit {summary?.topicFit ?? "—"}
            </span>
          </div>
          {summary && (
            <p className="text-content-subtle mt-1 text-sm">
              {summary.matchedContentCount} of {summary.recentContentCount} recent{" "}
              {contentNoun(
                summary.platforms ?? [],
                summary.recentContentCount,
              )}{" "}
              related to{" "}
              {query ? (
                <span className="text-content-emphasis font-medium">
                  “{truncateQuery(query)}”
                </span>
              ) : (
                "your search"
              )}
              .
            </p>
          )}
        </div>

        <CoverageSummaryBar summary={summary} />

        {metaParts.length > 0 && (
          <div className="text-content-subtle text-xs">
            {metaParts.join(" · ")}
          </div>
        )}
      </div>

      <div className="border-border-subtle mt-5 border-t pt-5">
        {/* Top matches — ranked by the relevance + reach blend */}
        <div className="flex flex-col gap-1">
          <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
            Most relevant content
          </h3>
          <p className="text-content-muted text-[11px] font-medium">
            {topContentCaption}
            {isRefining && (
              <span className="text-content-muted/70"> · refining match…</span>
            )}
          </p>
        </div>

        <div className="divide-border-subtle mt-3 divide-y">
          {error ? (
            <div className="text-content-subtle py-3.5 text-sm">
              Failed to load search matches
            </div>
          ) : isLoadingRows ? (
            <ContentMatchSkeletons
              count={PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount}
            />
          ) : topContent.length ? (
            topContent.map((item) => (
              <ContentMatchRow key={item.contentItemId} item={item} />
            ))
          ) : (
            <div className="text-content-subtle py-3.5 text-sm">
              No matching content found for this partner.
            </div>
          )}
        </div>

        {/* All matches — same matched set, simply most-recent-first */}
        {showAllSection && (
          <div className="mt-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                All matching content
              </h3>
              <p className="text-content-muted text-[11px] font-medium">
                Most recent first
              </p>
            </div>

            <div className="divide-border-subtle mt-3 divide-y">
              {visibleAll.map((item) => (
                <ContentMatchRow key={item.contentItemId} item={item} />
              ))}
            </div>

            {hiddenAllCount > 0 ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  text={`Show ${Math.min(
                    hiddenAllCount,
                    DETAIL_CONTENT_PAGE_COUNT,
                  )} more`}
                  onClick={() =>
                    setVisibleAllCount(
                      (count) => count + DETAIL_CONTENT_PAGE_COUNT,
                    )
                  }
                  className="h-9 rounded-lg px-4"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchFitPanelSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true">
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-44 max-w-full animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-neutral-100" />
          </div>
          <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="h-2.5 w-full animate-pulse rounded-full bg-neutral-100" />
        <div className="h-3 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
      </div>

      <div className="border-border-subtle mt-5 border-t pt-5">
        <div className="flex flex-col gap-1">
          <div className="h-3 w-20 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="divide-border-subtle mt-3 divide-y">
          <ContentMatchSkeletons
            count={PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount}
          />
        </div>
      </div>
    </div>
  );
}
