"use client";

import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import {
  type PartnerContentMatchEvidence,
  type PartnerContentSearchPartner,
} from "@/lib/swr/use-partner-content-search";
import { cn, nFormatter } from "@dub/utils";
import {
  formatDuration,
  formatMatchPercent,
  formatPublishedDate,
  formatTimestamp,
  getContentHref,
  getContentThumbnail,
  getContentTitle,
} from "../content-display-utils";
import { PlatformIcon } from "../platform-icon";
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
  const evidence = item.matchEvidence;
  const isTimedTranscriptMatch = chunk
    ? hasTimedTranscriptMatch(chunk.chunk)
    : false;
  const timeLabel =
    chunk && isTimedTranscriptMatch
      ? formatChunkTimeRange(chunk.chunk)
      : formatDuration(item.durationMs);
  const dateLabel = formatPublishedDate(item.publishedAt);
  const matchTags = getMatchTags(
    evidence,
    chunk?.chunk.source ??
      (evidence.primarySource === "creatorText" ? "metadata" : "transcript"),
  );
  const snippet = chunk ? getMatchSnippet(chunk) : null;
  const excerpt = snippet ? `"…${snippet.slice(0, 130).trimEnd()}…"` : null;
  const thumbnail = getItemThumbnail(item);
  const meta = [timeLabel, dateLabel].filter(Boolean).join(" · ");
  const score = item.relevance;
  const title = getItemTitle(item);
  const viewCount = item.viewCount;

  return (
    <a
      href={getItemHref(item)}
      target="_blank"
      rel="noopener noreferrer"
      className="group hover:bg-bg-muted flex items-center gap-3.5 py-3 transition-colors"
    >
      {/* Preview image */}
      <div className="bg-bg-subtle relative h-14 w-[88px] shrink-0 overflow-hidden rounded-lg">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <PlatformIcon platform={item.platform} className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={item.platform} className="size-3.5 shrink-0" />
          <span className="text-content-emphasis truncate text-sm font-semibold">
            {title}
          </span>
        </div>
        <div className="text-content-subtle mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          {meta && <span>{meta}</span>}
          {matchTags.length > 0 && (
            <>
              {meta && <span className="text-content-muted">·</span>}
              <span className="flex flex-wrap items-center gap-1">
                {matchTags.map((tag) => (
                  <span
                    key={tag.source}
                    className={cn(
                      tag.source === "transcript"
                        ? "text-blue-600"
                        : "text-content-subtle",
                    )}
                  >
                    {tag.label}
                  </span>
                ))}
              </span>
            </>
          )}
          {viewCount != null && viewCount > 0 && (
            <>
              <span className="text-content-muted">·</span>
              <span>{nFormatter(viewCount)} views</span>
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

function getMatchTags(
  evidence: PartnerContentMatchEvidence | undefined,
  fallbackSource: string,
) {
  const sources = evidence?.sources.length
    ? evidence.sources
    : fallbackSource === "metadata"
      ? ["creatorText" as const]
      : ["transcript" as const];

  return sources.map((source) => ({
    source,
    label: source === "transcript" ? "Transcript" : "Creator text",
  }));
}

// Displayed snippet. Transcript chunks are prose; creator-text chunks store the raw
// embedding input, so we surface just the creator-entered text.
function getMatchSnippet(chunk: PartnerContentSearchPartner["chunks"][number]) {
  const text = (chunk.chunk.text ?? "").trim();
  if (!text) return null;
  if (chunk.chunk.source !== "metadata") return text;

  const description = text.match(/Description:\s*([\s\S]+)$/i)?.[1];
  return (
    (
      description ?? text.replace(/^Content type:[\s\S]*?Title:\s*/i, "")
    ).trim() || null
  );
}

// Item thumbnail: the loaded chunk's preview, else a YouTube thumbnail from the id.
function getItemThumbnail(item: MatchedContentItem) {
  if (item.chunk) return getContentThumbnail(item.chunk);
  if (item.platform === "youtube" && item.platformContentId) {
    return `https://i.ytimg.com/vi/${item.platformContentId}/hqdefault.jpg`;
  }
  return null;
}

function getItemTitle(item: MatchedContentItem) {
  if (item.chunk) return getContentTitle(item.chunk);
  return item.title?.trim() || "Untitled content";
}

// Link for a matched item: the chunk-aware href (YouTube deep-link timestamp,
// Instagram normalization) when enriched, otherwise the bar's canonical URL.
function getItemHref(item: MatchedContentItem) {
  if (item.chunk) return getContentHref(item.chunk);
  return item.url ?? "#";
}

// Noun phrase for the rank window (time-based but capped per partner); says so
// explicitly when the cap bites instead of implying full coverage.
export function formatRankWindowPhrase(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
) {
  if (!summary || !summary.recentContentCount) return null;

  const { recentContentCount, oldestPublishedAt, newestPublishedAt } = summary;
  const oldest = formatMonthYear(oldestPublishedAt);
  const newest = formatMonthYear(newestPublishedAt);
  const countCapped =
    recentContentCount >= PARTNER_CONTENT_SEARCH_LIMITS.recentContentMaxPerPartner;

  if (countCapped) {
    return oldest
      ? `the ${recentContentCount} most recent posts, back to ${oldest}`
      : `the ${recentContentCount} most recent posts`;
  }

  if (oldest && newest) {
    return oldest === newest
      ? `${recentContentCount} ${
          recentContentCount === 1 ? "post" : "posts"
        } from ${oldest}`
      : `${recentContentCount} posts, ${oldest} – ${newest}`;
  }

  return `${recentContentCount} recent ${
    recentContentCount === 1 ? "post" : "posts"
  }`;
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

function hasTimedTranscriptMatch({
  source,
  startMs,
  endMs,
}: PartnerContentSearchPartner["chunks"][number]["chunk"]) {
  return source !== "metadata" && (startMs !== null || endMs !== null);
}

function formatChunkTimeRange({
  source,
  startMs,
  endMs,
}: PartnerContentSearchPartner["chunks"][number]["chunk"]) {
  if (source === "metadata") return "Creator text match";
  if (startMs === null && endMs === null) return "Transcript match";
  if (startMs !== null && endMs !== null) {
    return `${formatTimestamp(startMs)} - ${formatTimestamp(endMs)}`;
  }
  return formatTimestamp(startMs ?? endMs ?? 0);
}
