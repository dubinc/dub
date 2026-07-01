"use client";

import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { cn } from "@dub/utils";
import {
  contentNoun,
  formatDuration,
  formatEngagement,
  formatMatchPercent,
  formatPublishedDate,
  formatTimestamp,
  getContentHref,
  getContentThumbnail,
  getContentTitle,
} from "../content-display-utils";
import { PlatformIcon } from "../platform-icon";
import { ContentThumbnail } from "./content-thumbnail";
import { type MatchedContentItem } from "./search-fit-utils";

export function ContentMatchSkeletons({ count }: { count: number }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 py-3">
          <div className="h-14 w-[88px] shrink-0 animate-pulse rounded-lg bg-neutral-100" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 shrink-0 animate-pulse rounded-full bg-neutral-100" />
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="mt-1 h-3 w-40 max-w-full animate-pulse rounded bg-neutral-100" />
            <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
            <div className="h-2.5 w-8 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </>
  );
}

export function ContentMatchRow({ item }: { item: MatchedContentItem }) {
  const { chunk } = item;
  // Only transcript chunks display in UI.
  const isTranscriptChunk = chunk.chunk.source !== "metadata";
  const snippet = isTranscriptChunk ? getMatchSnippet(chunk) : null;
  const excerpt = snippet ? `"…${snippet.slice(0, 130).trimEnd()}…"` : null;
  const thumbnail = getContentThumbnail(chunk);
  const baseMeta = [
    formatDuration(chunk.content.durationMs),
    formatPublishedDate(item.publishedAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const matchLocation = formatMatchLocation(chunk.chunk);
  const engagement = formatEngagement(chunk.content);
  const score = item.relevance;
  const title = getContentTitle(chunk);

  return (
    <a
      href={getContentHref(chunk)}
      target="_blank"
      rel="noopener noreferrer"
      className="group hover:bg-bg-muted flex items-center gap-3.5 py-3 transition-colors"
    >
      {/* Preview image */}
      <ContentThumbnail thumbnail={thumbnail} platform={item.platform} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={item.platform} className="size-3.5 shrink-0" />
          <span className="text-content-emphasis truncate text-sm font-semibold">
            {title}
          </span>
        </div>
        <div className="text-content-subtle mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          {baseMeta && <span>{baseMeta}</span>}
          {matchLocation && (
            <>
              {baseMeta && <span className="text-content-muted">·</span>}
              <span
                className={cn(
                  isTranscriptChunk ? "text-blue-600" : "text-content-subtle",
                )}
              >
                {matchLocation}
              </span>
            </>
          )}
          {engagement && (
            <>
              {(baseMeta || matchLocation) && (
                <span className="text-content-muted">·</span>
              )}
              <span>{engagement}</span>
            </>
          )}
        </div>
        {excerpt && (
          <p className="text-content-subtle mt-1 line-clamp-1 text-sm">
            {excerpt}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-blue-700">
          {formatMatchPercent(score)}
        </span>
        <span className="text-content-muted text-[10px] font-medium uppercase tracking-wide">
          match
        </span>
      </div>
    </a>
  );
}

// Where the match was found, for the row meta: "Matched transcript 1:23 - 1:45",
// "Matched transcript" (untimed), or "Matched creator text".
function formatMatchLocation({
  source,
  startMs,
  endMs,
}: PartnerContentSearchPartner["chunks"][number]["chunk"]) {
  if (source === "metadata") return "Matched creator text";
  if (startMs === null && endMs === null) return "Matched transcript";
  if (startMs !== null && endMs !== null) {
    return `Matched transcript ${formatTimestamp(startMs)} - ${formatTimestamp(endMs)}`;
  }
  return `Matched transcript ${formatTimestamp(startMs ?? endMs ?? 0)}`;
}

function getMatchSnippet(chunk: PartnerContentSearchPartner["chunks"][number]) {
  return (chunk.chunk.text ?? "").trim() || null;
}

// Noun phrase for the rank window (time-based but capped per partner); says so
// explicitly when the cap bites instead of implying full coverage.
export function formatRankWindowPhrase(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
) {
  if (!summary || !summary.recentContentCount) return null;

  const { recentContentCount, oldestPublishedAt, newestPublishedAt } = summary;
  const noun = contentNoun(summary.platforms ?? [], recentContentCount);
  const oldest = formatMonthYear(oldestPublishedAt);
  const newest = formatMonthYear(newestPublishedAt);
  const countCapped =
    recentContentCount >= PARTNER_CONTENT_SEARCH_LIMITS.recentContentMaxPerPartner;

  if (countCapped) {
    return oldest
      ? `the ${recentContentCount} most recent ${noun}, back to ${oldest}`
      : `the ${recentContentCount} most recent ${noun}`;
  }

  if (oldest && newest) {
    return oldest === newest
      ? `${recentContentCount} ${noun} from ${oldest}`
      : `${recentContentCount} ${noun}, ${oldest} – ${newest}`;
  }

  return `${recentContentCount} recent ${noun}`;
}

function formatMonthYear(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}
