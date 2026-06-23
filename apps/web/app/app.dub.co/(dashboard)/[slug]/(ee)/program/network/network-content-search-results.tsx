"use client";

import type { PartnerContentTopicFitBand } from "@/lib/partner-content-search/constants";
import type { PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { Tooltip } from "@dub/ui";
import {
  Globe,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  User,
  YouTube,
} from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import type { PlatformType } from "@prisma/client";
import { useEffect, useState } from "react";
import {
  BAND_LABELS,
  type ContentSearchChunk,
  formatDuration,
  formatMatchPercent,
  formatPublishedDate,
  formatTimestamp,
  getContentHref,
  getContentThumbnail,
  getContentTitle,
} from "./content-display-utils";
import { NetworkPartnerCard } from "./network-partner-card";

const PLATFORM_LABELS: Partial<Record<PlatformType, string>> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

function platformLabel(platform: PlatformType) {
  return PLATFORM_LABELS[platform] ?? "partner";
}

function contentLabel(platform?: PlatformType) {
  return platform ? platformLabel(platform) : "indexed";
}

const TOP_CONTENT_PREVIEW_COUNT = 2;

type ContentSearchBar = NonNullable<
  PartnerContentSearchPartner["matchSummary"]
>["contentBars"][number];
type ContentPreviewItem = {
  chunk: ContentSearchChunk;
  bar?: ContentSearchBar;
};

export function NetworkContentSearchResults({
  error,
  hasQuery,
  isLoading,
  partners,
  platform,
  onToggleStarred,
}: {
  error: unknown;
  hasQuery: boolean;
  isLoading: boolean;
  partners?: PartnerContentSearchPartner[];
  platform?: PlatformType;
  onToggleStarred?: (partnerId: string, starred: boolean) => void;
}) {
  const label = contentLabel(platform);

  if (error) {
    return (
      <div className="text-content-subtle py-12 text-sm">
        Failed to search partner content
      </div>
    );
  }

  if (!partners && isLoading) {
    return (
      <div className="@5xl/page:grid-cols-4 @3xl/page:grid-cols-3 @xl/page:grid-cols-2 mt-4 grid grid-cols-1 gap-4 lg:gap-6">
        {[...Array(8)].map((_, idx) => (
          <div
            key={idx}
            className="border-border-subtle rounded-xl border bg-white"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
                <div className="h-7 w-20 animate-pulse rounded-full bg-neutral-100" />
              </div>
              <div className="mt-3.5 h-6 w-32 animate-pulse rounded bg-neutral-200" />
              <div className="mt-3 flex flex-col gap-2">
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>
            <div className="border-border-subtle border-t p-4 pt-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5">
                <div className="col-start-1 row-start-1 h-3 w-16 animate-pulse rounded bg-neutral-200" />
                <div className="col-start-2 row-start-1 h-3 w-20 justify-self-start animate-pulse rounded bg-neutral-200" />
                <div className="col-start-1 row-start-2 flex flex-col items-start gap-1">
                  <div className="h-8 w-11 animate-pulse rounded bg-neutral-200" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-100" />
                </div>
                <div className="col-start-2 row-start-2 flex items-center justify-start gap-1.5 justify-self-start">
                  {[...Array(TOP_CONTENT_PREVIEW_COUNT)].map((_, index) => (
                    <div
                      key={index}
                      className="size-11 animate-pulse rounded-lg bg-neutral-100"
                    />
                  ))}
                </div>
              </div>
              <div className="mt-2.5 h-3 w-32 animate-pulse rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-40 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!partners?.length) {
    return (
      <div className="py-24 text-center">
        <h3 className="text-content-emphasis text-base font-semibold">
          {hasQuery
            ? `No matching ${label} content found`
            : `No indexed ${label} content found`}
        </h3>
        <p className="text-content-subtle mt-2 text-sm">
          {hasQuery
            ? "Try a broader search or select a different platform."
            : "Try another platform or index more partner content."}
        </p>
      </div>
    );
  }

  return (
    <div className="@5xl/page:grid-cols-4 @3xl/page:grid-cols-3 @xl/page:grid-cols-2 mt-4 grid grid-cols-1 gap-4 lg:gap-6">
      {partners.map((partner) => (
        <NetworkPartnerCard
          key={partner.partnerId}
          partner={partner.partner}
          onToggleStarred={
            onToggleStarred
              ? (starred) => onToggleStarred(partner.partnerId, starred)
              : undefined
          }
          bottomContent={
            <NetworkPartnerContentMatch
              hasQuery={hasQuery}
              partner={partner}
              platform={platform}
            />
          }
        />
      ))}
    </div>
  );
}

function NetworkPartnerContentMatch({
  hasQuery,
  partner,
  platform,
}: {
  hasQuery: boolean;
  partner: PartnerContentSearchPartner;
  platform?: PlatformType;
}) {
  const summary = partner.matchSummary;
  const platforms = (
    summary?.topPlatforms?.length
      ? summary.topPlatforms
      : summary?.platforms ?? [platform].filter(Boolean)
  ) as string[];

  // List mode (no query): no topic fit, so show platforms + last-published recency.
  if (!hasQuery) {
    return (
      <div className="border-border-subtle border-t p-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-content-emphasis text-sm font-semibold">
            Recent content
          </span>
          <span className="text-content-subtle shrink-0 text-xs font-medium">
            {formatPublishedWindow(summary)}
          </span>
        </div>
        <div className="text-content-subtle mt-2.5 flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <PlatformIcons platforms={platforms} />
          <span className="truncate">{formatPlatformNames(platforms)}</span>
        </div>
      </div>
    );
  }

  const band = summary?.band ?? "none";
  const styles = BAND_STYLES[band];
  const followers = summary?.followers ?? null;
  const medianViews = summary?.medianViews ?? null;
  const matchLabel = formatMatchEvidenceLabel(summary);
  const lastOnTopic = lastPublishedLabel(summary?.lastOnTopicAt);
  const previewItems = getContentPreviewItems(partner);

  return (
    <div className="border-border-subtle border-t p-4 pt-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5">
        <span className="text-content-subtle col-start-1 row-start-1 text-[11px] font-semibold uppercase tracking-wide">
          Topic fit
        </span>
        {previewItems.length > 0 && (
          <span className="text-content-subtle col-start-2 row-start-1 justify-self-start text-[11px] font-semibold uppercase tracking-wide">
            Top matches
          </span>
        )}
        <div className="col-start-1 row-start-2 flex min-w-0 flex-col items-start gap-1">
          <span
            className={cn(
              "text-[28px] font-bold leading-none tabular-nums",
              styles.number,
            )}
          >
            {summary?.topicFit ?? 0}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
              styles.chip,
            )}
          >
            {BAND_LABELS[band]}
          </span>
        </div>

        <ContentPreviewTiles items={previewItems} />
      </div>
      {(followers || medianViews) && (
        <div className="text-content-default mt-2.5 flex min-w-0 items-center gap-1.5 text-xs font-medium">
          {followers ? (
            <span className="shrink-0">{nFormatter(followers)} followers</span>
          ) : null}
          {followers && medianViews ? (
            <span className="text-content-muted">·</span>
          ) : null}
          {medianViews ? (
            <span className="shrink-0">
              {nFormatter(medianViews)} median views
            </span>
          ) : null}
        </div>
      )}
      <div className="text-content-subtle mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium">
        <PlatformIcons platforms={platforms} />
        <span className="truncate">{matchLabel}</span>
        {lastOnTopic && (
          <>
            <span className="text-content-muted">·</span>
            <span className="text-content-muted shrink-0">
              last post {lastOnTopic}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function getContentPreviewItems(
  partner: PartnerContentSearchPartner,
): ContentPreviewItem[] {
  const barsByContentItemId = new Map(
    partner.matchSummary?.contentBars.map((bar) => [
      bar.partnerContentItemId,
      bar,
    ]) ?? [],
  );
  const seenContentItems = new Set<string>();
  const items: ContentPreviewItem[] = [];

  for (const chunk of partner.chunks) {
    if (seenContentItems.has(chunk.partnerContentItemId)) continue;

    seenContentItems.add(chunk.partnerContentItemId);
    items.push({
      chunk,
      bar: barsByContentItemId.get(chunk.partnerContentItemId),
    });

    if (items.length === TOP_CONTENT_PREVIEW_COUNT) break;
  }

  return items;
}

function ContentPreviewTiles({ items }: { items: ContentPreviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="col-start-2 row-start-2 flex shrink-0 items-center justify-start gap-1.5 justify-self-start"
      aria-label="Top matching content previews"
    >
      {items.map((item) => (
        <ContentPreviewTile key={item.chunk.chunkId} item={item} />
      ))}
    </div>
  );
}

function ContentPreviewTile({ item }: { item: ContentPreviewItem }) {
  const title = getContentTitle(item.chunk);

  return (
    <Tooltip
      content={<ContentPreviewTooltip item={item} />}
      delayDuration={100}
    >
      <a
        href={getContentHref(item.chunk)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="group block size-11 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20"
        aria-label={"Open " + title}
      >
        <ContentPreviewImage
          chunk={item.chunk}
          className="size-full"
          fallbackIconClassName="size-5"
          imageClassName="transition-transform duration-150 group-hover:scale-105"
          showPlatformBadge
        />
      </a>
    </Tooltip>
  );
}

function ContentPreviewImage({
  chunk,
  className,
  fallbackIconClassName = "size-5",
  imageClassName,
  showPlatformBadge = false,
}: {
  chunk: ContentSearchChunk;
  className?: string;
  fallbackIconClassName?: string;
  imageClassName?: string;
  showPlatformBadge?: boolean;
}) {
  const thumbnail = getContentThumbnail(chunk);
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnailSrc = hasImageError ? null : thumbnail;

  useEffect(() => {
    setHasImageError(false);
  }, [thumbnail]);

  return (
    <div className={cn("relative overflow-hidden bg-neutral-100", className)}>
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt=""
          className={cn("size-full object-cover", imageClassName)}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="text-content-subtle flex size-full items-center justify-center">
          <PlatformIcon
            platform={chunk.platform.type}
            className={fallbackIconClassName}
          />
        </div>
      )}
      {showPlatformBadge && (
        <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full border border-white bg-white/95 shadow-sm">
          <PlatformIcon platform={chunk.platform.type} className="size-3.5" />
        </span>
      )}
    </div>
  );
}

function ContentPreviewTooltip({ item }: { item: ContentPreviewItem }) {
  const { chunk, bar } = item;
  const title = getContentTitle(chunk);
  const metadata = [
    formatDuration(chunk.content.durationMs),
    formatPublishedDate(chunk.content.publishedAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const engagementMetrics = getContentEngagementMetrics(chunk, bar);
  const matchLocation = formatChunkMatchLocation(chunk);
  const matchScore = formatMatchPercent(chunk.rerankScore ?? chunk.score);

  return (
    <div className="w-[300px] px-3 py-2">
      <div className="flex items-start gap-2.5">
        <ContentPreviewImage
          chunk={chunk}
          className="size-16 shrink-0 rounded-lg border border-neutral-200"
          fallbackIconClassName="size-6"
          showPlatformBadge
        />
        <div className="min-w-0 pt-0.5">
          <div className="text-content-emphasis line-clamp-3 text-xs font-semibold">
            {title}
          </div>
          {metadata && (
            <div className="text-content-subtle mt-1 text-[11px]">
              {metadata}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-700">
          {matchScore} relevance
        </span>
        {matchLocation && (
          <span className="text-content-subtle min-w-0 truncate text-[11px] font-medium">
            {matchLocation}
          </span>
        )}
      </div>

      {engagementMetrics.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {engagementMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex h-10 min-w-0 flex-col items-center justify-center rounded-md bg-neutral-50 px-1"
            >
              <span className="text-content-emphasis max-w-full truncate text-[11px] font-semibold leading-none tabular-nums">
                {metric.value}
              </span>
              <span className="text-content-muted mt-0.5 max-w-full truncate text-[9px] font-semibold uppercase leading-none tracking-wide">
                {metric.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const Icon = PLATFORM_ICONS[platform as PlatformType] ?? User;

  return <Icon className={cn("size-4", className)} />;
}

function getContentEngagementMetrics(
  chunk: ContentSearchChunk,
  bar: ContentSearchBar | undefined,
) {
  return [
    { label: "Views", value: chunk.content.viewCount ?? bar?.viewCount },
    { label: "Likes", value: chunk.content.likeCount ?? bar?.likeCount },
    {
      label: "Comments",
      value: chunk.content.commentCount ?? bar?.commentCount,
    },
    { label: "Shares", value: chunk.content.shareCount ?? bar?.shareCount },
    { label: "Saves", value: chunk.content.saveCount ?? bar?.saveCount },
  ]
    .filter((metric): metric is { label: string; value: number } => {
      return metric.value != null && metric.value > 0;
    })
    .map((metric) => ({
      label: metric.label,
      value: nFormatter(metric.value),
    }));
}

function formatChunkMatchLocation(chunk: ContentSearchChunk) {
  if (chunk.chunk.source === "metadata") return "Matched creator text";
  if (chunk.chunk.startMs === null && chunk.chunk.endMs === null) {
    return "Matched transcript";
  }
  if (chunk.chunk.startMs !== null && chunk.chunk.endMs !== null) {
    return `Matched transcript ${formatTimestamp(
      chunk.chunk.startMs,
    )} - ${formatTimestamp(chunk.chunk.endMs)}`;
  }
  return `Matched transcript ${formatTimestamp(
    chunk.chunk.startMs ?? chunk.chunk.endMs ?? 0,
  )}`;
}

// Number + chip colors per band (number color follows the tier).
const BAND_STYLES: Record<
  PartnerContentTopicFitBand,
  { number: string; chip: string }
> = {
  consistent: {
    number: "text-green-600",
    chip: "border-green-100 bg-green-50 text-green-700",
  },
  frequent: {
    number: "text-blue-600",
    chip: "border-blue-100 bg-blue-50 text-blue-700",
  },
  occasional: {
    number: "text-amber-600",
    chip: "border-amber-100 bg-amber-50 text-amber-700",
  },
  "one-off": {
    number: "text-neutral-500",
    chip: "border-neutral-200 bg-neutral-100 text-neutral-600",
  },
  none: {
    number: "text-neutral-400",
    chip: "border-neutral-200 bg-neutral-100 text-neutral-500",
  },
};

const PLATFORM_ICONS: Partial<Record<PlatformType, typeof User>> = {
  youtube: YouTube,
  instagram: Instagram,
  tiktok: TikTok,
  twitter: Twitter,
  linkedin: LinkedIn,
  website: Globe,
};

function PlatformIcons({ platforms }: { platforms: string[] }) {
  const icons = platforms
    .map((platform) => PLATFORM_ICONS[platform as PlatformType])
    .filter((icon): icon is typeof User => Boolean(icon));

  if (!icons.length) {
    return <User className="text-content-muted size-3.5 shrink-0" />;
  }

  return (
    // No text-color override: the brand icons carry their own colors.
    <span className="flex shrink-0 items-center gap-1">
      {icons.map((Icon, index) => (
        <Icon key={index} className="size-3.5" />
      ))}
    </span>
  );
}

// Coarse "Nd/Nw/Nmo ago" (timeAgo from @dub/utils goes absolute past ~23h).
function lastPublishedLabel(iso: string | null | undefined) {
  if (!iso) return null;

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 8 * 7) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatMatchEvidenceLabel(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
) {
  const matchingPosts = summary?.matchedContentCount ?? 0;
  const recentPosts = summary?.recentContentCount ?? 0;

  // Aggregate coverage; splitting by source reads noisy on the compact card.
  if (recentPosts > 0) {
    return `${matchingPosts} of ${recentPosts} matching`;
  }

  return `${matchingPosts} matching ${matchingPosts === 1 ? "post" : "posts"}`;
}

function formatPlatformNames(platforms: Array<string | undefined>) {
  const uniquePlatforms = Array.from(new Set(platforms.filter(Boolean)));

  if (uniquePlatforms.length === 0) return "indexed content";

  return uniquePlatforms
    .map((platform) => platformLabel(platform as PlatformType))
    .join(", ");
}

function formatPublishedWindow(
  summary: PartnerContentSearchPartner["matchSummary"],
) {
  if (!summary?.oldestPublishedAt || !summary.newestPublishedAt) {
    return "recent content";
  }

  const oldest = new Date(summary.oldestPublishedAt);
  const newest = new Date(summary.newestPublishedAt);
  const monthDiff = Math.max(
    1,
    (newest.getFullYear() - oldest.getFullYear()) * 12 +
      newest.getMonth() -
      oldest.getMonth() +
      1,
  );

  return `past ${monthDiff} ${monthDiff === 1 ? "month" : "months"}`;
}
