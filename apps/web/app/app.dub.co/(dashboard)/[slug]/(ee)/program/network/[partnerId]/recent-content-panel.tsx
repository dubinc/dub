"use client";

import { PARTNER_CONTENT_SEARCH_TOP_CONTENT } from "@/lib/partner-content-search/constants";
import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { type NetworkPartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { useState } from "react";
import {
  formatDuration,
  formatEngagement,
  formatPublishedDate,
  getContentHref,
  getContentThumbnail,
  getContentTitle,
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
  engagement: string;
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
  const items = buildRecentItems(searchPartner?.chunks ?? []);

  const topContent = [...items]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount);
  // "Recent content" only earns its own section when it adds rows beyond the top set.
  const showRecentSection =
    !isLoading &&
    items.length > PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount;

  const categories = (partner?.categories ?? []).slice(0, MAX_NICHE_CHIPS);

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
            <RecentContentList
              chunks={searchPartner?.chunks ?? []}
              isLoading={isLoading}
              error={error}
              title="Recent content"
              caption="Most recent first"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Newest-first content list with a "Show more" control. Shared by the no-search
// panel's "Recent content" and the search panel's "All recent content".
export function RecentContentList({
  chunks,
  isLoading,
  error,
  title,
  caption,
  skeletonCount = PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount,
}: {
  chunks: PartnerContentSearchPartner["chunks"];
  isLoading: boolean;
  error: unknown;
  title: string;
  caption: string;
  skeletonCount?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(RECENT_INITIAL_COUNT);

  const items = [...buildRecentItems(chunks)].sort(
    (a, b) => publishedAtMs(b.publishedAt) - publishedAtMs(a.publishedAt),
  );
  const visible = items.slice(0, visibleCount);
  const hiddenCount = Math.max(0, items.length - visible.length);

  return (
    <div>
      <div className="flex flex-col gap-1">
        <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-content-muted text-[11px] font-medium">{caption}</p>
      </div>

      <div className="divide-border-subtle mt-3 divide-y">
        {error ? (
          <div className="text-content-subtle py-3.5 text-sm">
            Failed to load recent content
          </div>
        ) : isLoading ? (
          <ContentMatchSkeletons count={skeletonCount} />
        ) : visible.length ? (
          visible.map((item) => (
            <RecentContentRow key={item.contentItemId} item={item} />
          ))
        ) : (
          <div className="text-content-subtle py-3.5 text-sm">
            No indexed content found for this partner.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            text={`Show ${Math.min(hiddenCount, RECENT_INCREMENT)} more`}
            onClick={() => setVisibleCount((count) => count + RECENT_INCREMENT)}
            className="h-9 rounded-lg px-4"
          />
        </div>
      ) : null}
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
        <div className="text-content-subtle mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          {meta && <span>{meta}</span>}
          {item.engagement && (
            <>
              {meta && <span className="text-content-muted">·</span>}
              <span>{item.engagement}</span>
            </>
          )}
        </div>
      </div>
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
      engagement: formatEngagement(chunk.content),
    });
  }

  return [...byContentItemId.values()];
}
