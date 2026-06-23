import type { PartnerContentTopicFitBand } from "@/lib/partner-content-search/constants";
import { getPartnerContentThumbnailUrl } from "@/lib/partner-content-search/thumbnail-url";
import type { PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";

// Shared display helpers for the network search surfaces (detail page + results
// list): formatters, link/thumbnail resolvers, and the band label map.

export type ContentSearchChunk = PartnerContentSearchPartner["chunks"][number];

export const BAND_LABELS: Record<PartnerContentTopicFitBand, string> = {
  consistent: "Consistent",
  frequent: "Frequent",
  occasional: "Occasional",
  "one-off": "One-off",
  none: "No recent match",
};

export function formatTimestamp(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDuration(durationMs: number | null) {
  if (!durationMs || durationMs <= 0) return null;

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatPublishedDate(publishedAt: string | null) {
  if (!publishedAt) return null;

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatMatchPercent(score: number) {
  return `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;
}

// Coarse "Nd / Nw / Nmo ago" relative label for the last on-topic/published post.
// timeAgo from @dub/utils goes absolute past ~23h, so we roll our own.
export function lastPostedLabel(iso: string | null | undefined) {
  if (!iso) return null;

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 8 * 7) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function getContentThumbnail(chunk: ContentSearchChunk) {
  if (chunk.content.thumbnailUrl) {
    return getPartnerContentThumbnailUrl(chunk.content.thumbnailUrl);
  }

  if (chunk.platform.type === "youtube") {
    return `https://i.ytimg.com/vi/${chunk.content.platformContentId}/hqdefault.jpg`;
  }

  return null;
}

export function getContentTitle(chunk: ContentSearchChunk) {
  return (
    chunk.content.title?.trim() ||
    chunk.content.description?.trim().split(/\r?\n/)[0] ||
    "Untitled content"
  );
}

export function getContentHref(chunk: ContentSearchChunk) {
  if (chunk.platform.type === "instagram") {
    return getInstagramContentHref(chunk);
  }

  if (chunk.platform.type !== "youtube" || chunk.chunk.startMs === null) {
    return chunk.content.url;
  }

  try {
    const url = new URL(chunk.content.url);
    url.searchParams.set("t", `${Math.floor(chunk.chunk.startMs / 1000)}s`);
    return url.toString();
  } catch {
    return chunk.content.url;
  }
}

export function getInstagramContentHref(chunk: ContentSearchChunk) {
  const shortcode =
    extractInstagramShortcode(chunk.content.url) ||
    chunk.content.platformContentId;

  return `https://www.instagram.com/${chunk.content.type === "reel" ? "reel" : "p"}/${shortcode}/`;
}

export function extractInstagramShortcode(url: string) {
  try {
    return (
      new URL(url).pathname.match(
        /^\/(?:(?:[^/]+)\/)?(?:p|reel|tv)\/([^/?#]+)/,
      )?.[1] ?? null
    );
  } catch {
    return (
      url.match(
        /instagram\.com\/(?:(?:[^/]+)\/)?(?:p|reel|tv)\/([^/?#]+)/,
      )?.[1] ?? null
    );
  }
}
