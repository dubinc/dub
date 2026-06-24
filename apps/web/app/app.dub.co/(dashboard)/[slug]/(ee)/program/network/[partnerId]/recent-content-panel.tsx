"use client";

import { PARTNER_CONTENT_SEARCH_TOP_CONTENT } from "@/lib/partner-content-search/constants";
import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { type NetworkPartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { nFormatter } from "@dub/utils";
import { useState } from "react";
import {
  formatDuration,
  formatPublishedDate,
  getContentHref,
  getContentThumbnail,
  getContentTitle,
  lastPostedLabel,
} from "../content-display-utils";
import { PlatformIcon } from "../platform-icon";
import { ContentMatchSkeletons } from "./content-match-row";
import { ContentThumbnail } from "./content-thumbnail";
import { publishedAtMs } from "./search-fit-utils";

const RECENT_INITIAL_COUNT = 8;
const RECENT_INCREMENT = 8;
const MAX_NICHE_CHIPS = 3;

type RecentContentItem = {
  contentItemId: string;
  platform: string;
  title: string;
  href: string;
  thumbnail: string | null;
  publishedAt: string | null;
  durationMs: number | null;
  viewCount: number | null;
};

export function RecentContentPanel({
  partner,
  searchPartner,
  isLoading,
  error,
}: {
  partner?: NetworkPartnerProps;
  searchPartner?: PartnerContentSearchPartner;
  isLoading: boolean;
  error: unknown;
}) {
  const [visibleRecentCount, setVisibleRecentCount] =
    useState(RECENT_INITIAL_COUNT);

  const items = buildRecentItems(searchPartner?.chunks ?? []);

  const topContent = [...items]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount);
  const recentContent = [...items].sort(
    (a, b) => publishedAtMs(b.publishedAt) - publishedAtMs(a.publishedAt),
  );
  const visibleRecent = recentContent.slice(0, visibleRecentCount);
  const hiddenRecentCount = Math.max(0, recentContent.length - visibleRecent.length);
  // "Recent content" only earns its own section when it adds rows beyond the top set.
  const showRecentSection =
    !isLoading &&
    recentContent.length > PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount;

  const categories = (partner?.categories ?? []).slice(0, MAX_NICHE_CHIPS);
  const followers = sumFollowers(partner);
  const medianViews = medianViewCount(items);
  const lastPublished = lastPostedLabel(
    recentContent.find((item) => item.publishedAt)?.publishedAt,
  );
  const metaParts = [
    followers ? `${nFormatter(followers)} followers` : null,
    medianViews ? `${nFormatter(medianViews)} median views` : null,
    lastPublished ? `last published ${lastPublished}` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3">
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((category) => (
              <span
                key={category}
                className="bg-bg-muted text-content-default rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                {category}
              </span>
            ))}
          </div>
        )}
        {metaParts.length > 0 && (
          <div className="text-content-subtle text-xs">
            {metaParts.join(" · ")}
          </div>
        )}
      </div>

      <div className="border-border-subtle mt-5 border-t pt-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
            Top content
          </h3>
          <p className="text-content-muted text-[11px] font-medium">
            Ranked by reach
          </p>
        </div>

        <div className="divide-border-subtle mt-3 divide-y">
          {error ? (
            <div className="text-content-subtle py-3.5 text-sm">
              Failed to load recent content
            </div>
          ) : isLoading ? (
            <ContentMatchSkeletons
              count={PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount}
            />
          ) : topContent.length ? (
            topContent.map((item) => (
              <RecentContentRow key={item.contentItemId} item={item} />
            ))
          ) : (
            <div className="text-content-subtle py-3.5 text-sm">
              No indexed content found for this partner.
            </div>
          )}
        </div>

        {showRecentSection && (
          <div className="mt-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                Recent content
              </h3>
              <p className="text-content-muted text-[11px] font-medium">
                Most recent first
              </p>
            </div>

            <div className="divide-border-subtle mt-3 divide-y">
              {visibleRecent.map((item) => (
                <RecentContentRow key={item.contentItemId} item={item} />
              ))}
            </div>

            {hiddenRecentCount > 0 ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  text={`Show ${Math.min(hiddenRecentCount, RECENT_INCREMENT)} more`}
                  onClick={() =>
                    setVisibleRecentCount((count) => count + RECENT_INCREMENT)
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

function RecentContentRow({ item }: { item: RecentContentItem }) {
  const meta = [formatDuration(item.durationMs), formatPublishedDate(item.publishedAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group hover:bg-bg-muted flex items-center gap-3.5 py-3 transition-colors"
    >
      <ContentThumbnail thumbnail={item.thumbnail} platform={item.platform} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={item.platform} className="size-3.5 shrink-0" />
          <span className="text-content-emphasis truncate text-sm font-semibold">
            {item.title}
          </span>
        </div>
        {meta && (
          <div className="text-content-subtle mt-0.5 text-xs">{meta}</div>
        )}
      </div>
      {item.viewCount != null && item.viewCount > 0 && (
        <span className="text-content-default shrink-0 text-xs font-medium tabular-nums">
          {nFormatter(item.viewCount)} views
        </span>
      )}
    </a>
  );
}

// One row per content item (chunks repeat per item — keep the first, its content
// fields are identical across its chunks).
function buildRecentItems(
  chunks: PartnerContentSearchPartner["chunks"],
): RecentContentItem[] {
  const byContentItemId = new Map<string, RecentContentItem>();

  for (const chunk of chunks) {
    if (byContentItemId.has(chunk.partnerContentItemId)) continue;
    byContentItemId.set(chunk.partnerContentItemId, {
      contentItemId: chunk.partnerContentItemId,
      platform: chunk.platform.type,
      title: getContentTitle(chunk),
      href: getContentHref(chunk),
      thumbnail: getContentThumbnail(chunk),
      publishedAt: chunk.content.publishedAt,
      durationMs: chunk.content.durationMs,
      viewCount: chunk.content.viewCount,
    });
  }

  return [...byContentItemId.values()];
}

function sumFollowers(partner?: NetworkPartnerProps) {
  if (!partner?.platforms?.length) return null;
  const total = partner.platforms.reduce(
    (sum, platform) => sum + Number(platform.subscribers ?? 0),
    0,
  );
  return total > 0 ? total : null;
}

function medianViewCount(items: RecentContentItem[]) {
  const views = items
    .map((item) => item.viewCount)
    .filter((value): value is number => value != null && value > 0)
    .sort((a, b) => a - b);
  if (!views.length) return null;

  const mid = Math.floor(views.length / 2);
  return views.length % 2 === 0
    ? Math.round((views[mid - 1] + views[mid]) / 2)
    : views[mid];
}
