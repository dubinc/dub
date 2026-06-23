"use client";

import {
  PARTNER_CONTENT_SEARCH_TOP_CONTENT,
  type PartnerContentTopicFitBand,
} from "@/lib/partner-content-search/constants";
import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { Button } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { useState } from "react";
import { BAND_LABELS, lastPostedLabel } from "../content-display-utils";
import { PlatformIcon } from "../platform-icon";
import {
  ContentMatchRow,
  ContentMatchSkeletons,
  formatRankWindowPhrase,
} from "./content-match-row";
import { ContentMatchBars } from "./search-fit-bars";
import {
  buildMatchedContentItems,
  buildUnifiedRelevanceMap,
  DETAIL_CONTENT_INITIAL_MATCH_COUNT,
  DETAIL_CONTENT_MATCH_INCREMENT,
  publishedAtMs,
} from "./search-fit-utils";

const TOPIC_FIT_BAND_STYLES: Record<
  PartnerContentTopicFitBand,
  { number: string; chip: string }
> = {
  consistent: { number: "text-green-600", chip: "bg-green-50 text-green-700" },
  frequent: { number: "text-blue-600", chip: "bg-blue-50 text-blue-700" },
  occasional: { number: "text-amber-600", chip: "bg-amber-50 text-amber-700" },
  "one-off": {
    number: "text-neutral-500",
    chip: "bg-neutral-100 text-neutral-600",
  },
  none: { number: "text-neutral-400", chip: "bg-neutral-100 text-neutral-500" },
};

export function SearchFitPanel({
  error,
  isLoading,
  isRefining = false,
  summary: initialSummary,
  relevanceSummary,
  searchPartner,
}: {
  error: unknown;
  isLoading: boolean;
  // Scoped rerank in flight; when it lands, every row's relevance moves to one scale.
  isRefining?: boolean;
  summary?: PartnerContentSearchPartner["matchSummary"];
  // Scoped reranked summary, only to put per-row relevance on one scale. Null until it resolves.
  relevanceSummary?: PartnerContentSearchPartner["matchSummary"] | null;
  searchPartner?: PartnerContentSearchPartner;
}) {
  const [visibleAllCount, setVisibleAllCount] = useState(
    DETAIL_CONTENT_INITIAL_MATCH_COUNT,
  );
  const summary = initialSummary ?? searchPartner?.matchSummary;

  if (isLoading && !summary) {
    return <SearchFitPanelSkeleton />;
  }

  const isLoadingRows = isLoading || isRefining;
  // Per-item relevance on a single scale, from the scoped reranked summary.
  const unifiedRelevanceByItemId = buildUnifiedRelevanceMap(relevanceSummary);
  // Hold row rendering until the scoped run finishes so snippets/order don't swap in.
  const items = buildMatchedContentItems(
    summary,
    isLoadingRows ? [] : (searchPartner?.chunks ?? []),
    unifiedRelevanceByItemId,
  );

  // Top content: relevance + reach blend. All content: same set, newest-first.
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
  const bandStyles = TOPIC_FIT_BAND_STYLES[band];
  const topPlatforms = summary?.topPlatforms?.length
    ? summary.topPlatforms
    : summary?.platforms ?? [];
  const lastOnTopic = lastPostedLabel(summary?.lastOnTopicAt ?? null);
  const rankWindowPhrase = formatRankWindowPhrase(summary);
  const topContentCaption = rankWindowPhrase
    ? `Ranked by relevance + reach across ${rankWindowPhrase}.`
    : "Ranked by relevance + reach.";

  return (
    <div className="flex flex-col">
      {/* Topic fit summary row — layout adapted from the Partner Search hi-fi ref */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Topic fit
          </div>
          <div className="mt-1.5 flex items-end gap-2.5">
            <span
              className={cn(
                "text-[34px] font-bold leading-none tabular-nums",
                bandStyles.number,
              )}
            >
              {summary?.topicFit ?? "—"}
            </span>
            <span
              className={cn(
                "mb-1 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                bandStyles.chip,
              )}
            >
              {BAND_LABELS[band]}
            </span>
          </div>
        </div>

        <div className="h-10 w-px shrink-0 bg-neutral-200" />

        <div className="min-w-[200px] flex-1">
          <div className="text-content-default flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium">
            {summary?.followers ? (
              <span>{nFormatter(summary.followers)} followers</span>
            ) : null}
            {summary?.followers && summary?.medianViews ? (
              <span className="text-neutral-300">·</span>
            ) : null}
            {summary?.medianViews ? (
              <span>{nFormatter(summary.medianViews)} median views</span>
            ) : null}
          </div>
          <ContentMatchBars summary={summary} />
          {summary && (
            <div className="text-content-subtle mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span>
                {summary.matchedContentCount} of {summary.recentContentCount}{" "}
                matching
              </span>
              {topPlatforms.length > 0 && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>matched on</span>
                  <span className="flex items-center gap-1">
                    {topPlatforms.map((platform) => (
                      <PlatformIcon
                        key={platform}
                        platform={platform}
                        className="size-3.5"
                      />
                    ))}
                  </span>
                </>
              )}
              {lastOnTopic && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>last post {lastOnTopic}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-border-subtle mt-5 border-t pt-5">
        {/* Top content — ranked by the relevance + reach blend */}
        <div className="flex flex-col gap-1">
          <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
            Top content
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

        {/* All content — same matched set, simply most-recent-first */}
        {showAllSection && (
          <div className="mt-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                All content
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
                    DETAIL_CONTENT_MATCH_INCREMENT,
                  )} more`}
                  onClick={() =>
                    setVisibleAllCount(
                      (count) => count + DETAIL_CONTENT_MATCH_INCREMENT,
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
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="shrink-0">
          <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 flex items-end gap-2.5">
            <div className="h-9 w-14 animate-pulse rounded bg-neutral-200" />
            <div className="mb-1 h-6 w-20 animate-pulse rounded-full bg-neutral-100" />
          </div>
        </div>

        <div className="h-10 w-px shrink-0 bg-neutral-200" />

        <div className="min-w-[200px] flex-1">
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-neutral-200" />
          <div className="mt-2.5 flex h-9 items-end gap-[3px]">
            {[...Array(18)].map((_, index) => (
              <div
                key={index}
                className="min-w-[5px] flex-1 animate-pulse rounded-full bg-neutral-100"
                style={{ height: 6 + (index % 5) * 6 }}
              />
            ))}
          </div>
          <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
        </div>
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
