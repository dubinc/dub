"use client";

import type { PartnerContentTopicFitBand } from "@/lib/partner-content-search/constants";
import type { PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
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
              <div className="h-5 w-28 animate-pulse rounded bg-neutral-200" />
              <div className="mt-3 flex h-12 items-end gap-1.5">
                {[...Array(12)].map((_, index) => (
                  <div
                    key={index}
                    className="w-2.5 animate-pulse rounded-full bg-neutral-200"
                    style={{ height: index % 3 === 0 ? 32 : 12 }}
                  />
                ))}
              </div>
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

  // List mode (no query): there's no topic fit to score, so show the partner's
  // platforms + how recently they've published.
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

  return (
    <div className="border-border-subtle border-t p-4 pt-2">
      <span className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
        Topic fit
      </span>
      <div className="mt-1 flex items-center gap-2.5">
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
      <ContentMatchScoreDebug partner={partner} />
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

function ContentMatchScoreDebug({
  partner,
}: {
  partner: PartnerContentSearchPartner;
}) {
  const { cosineScore, rerankScore } = partner;

  if (cosineScore == null && rerankScore == null) return null;

  return (
    <div className="text-content-muted mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] leading-none">
      <span title="Raw cosine vector-search match">
        cos {cosineScore == null ? "-" : formatMatchPercent(cosineScore)}
      </span>
      <span aria-hidden>{"->"}</span>
      <span
        title="Voyage reranker match"
        className={rerankScore != null ? "text-blue-600" : undefined}
      >
        rerank {rerankScore == null ? "-" : formatMatchPercent(rerankScore)}
      </span>
    </div>
  );
}

const BAND_LABELS: Record<PartnerContentTopicFitBand, string> = {
  consistent: "Consistent",
  frequent: "Frequent",
  occasional: "Occasional",
  "one-off": "One-off",
  none: "No recent match",
};

// Number + chip colors per band. Number color follows the band tier so the score
// reads at a glance (green = consistent, down to gray = one-off/none).
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
    // No text-color override here: the YouTube/TikTok/Instagram icons carry their
    // own brand colors, so we let them render in color rather than desaturating
    // them to the surrounding muted text color.
    <span className="flex shrink-0 items-center gap-1">
      {icons.map((Icon, index) => (
        <Icon key={index} className="size-3.5" />
      ))}
    </span>
  );
}

// Coarse "Nd / Nw / Nmo ago" label for the last publish date (timeAgo from
// @dub/utils switches to absolute dates past ~23h, which we don't want here).
function lastPublishedLabel(iso: string | null | undefined) {
  if (!iso) return null;

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 8 * 7) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function clampScore(score: number) {
  return Math.min(1, Math.max(0, score));
}

function formatMatchPercent(score: number) {
  return `${Math.round(clampScore(score) * 100)}%`;
}

function formatMatchEvidenceLabel(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
) {
  const matchingPosts = summary?.matchedContentCount ?? 0;
  const recentPosts = summary?.recentContentCount ?? 0;

  // Aggregate coverage rather than splitting evidence by source (transcript vs
  // creator text), which read as noisy on the compact card.
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
