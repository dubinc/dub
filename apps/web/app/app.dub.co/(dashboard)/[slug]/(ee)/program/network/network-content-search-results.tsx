"use client";

import type { PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import type { PlatformType } from "@dub/prisma/client";
import { Button } from "@dub/ui";
import { ArrowUpRight, EnvelopeArrowRight } from "@dub/ui/icons";
import { memo } from "react";

const PLATFORM_LABELS: Partial<Record<PlatformType, string>> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

function platformLabel(platform: PlatformType) {
  return PLATFORM_LABELS[platform] ?? "partner";
}

export function NetworkContentSearchResults({
  error,
  hasQuery,
  isLoading,
  partners,
  platform,
  onOpenPartner,
}: {
  error: unknown;
  hasQuery: boolean;
  isLoading: boolean;
  partners?: PartnerContentSearchPartner[];
  platform: PlatformType;
  onOpenPartner: (partnerId: string) => void;
}) {
  const label = platformLabel(platform);

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
            className="border-border-subtle rounded-xl border bg-white p-4"
          >
            <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
            <div className="mt-4 h-5 w-36 animate-pulse rounded bg-neutral-200" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-neutral-100" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="aspect-square animate-pulse rounded-lg bg-neutral-100" />
              <div className="aspect-square animate-pulse rounded-lg bg-neutral-100" />
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
        <NetworkContentSearchCard
          key={partner.partnerId}
          hasQuery={hasQuery}
          partner={partner}
          platform={platform}
          onOpenPartner={onOpenPartner}
        />
      ))}
    </div>
  );
}

const NetworkContentSearchCard = memo(function NetworkContentSearchCard({
  hasQuery,
  partner,
  platform,
  onOpenPartner,
}: {
  hasQuery: boolean;
  partner: PartnerContentSearchPartner;
  platform: PlatformType;
  onOpenPartner: (partnerId: string) => void;
}) {
  const label = platformLabel(platform);
  const contentPreviews = Array.from(
    new Map(
      partner.chunks.map((chunk) => [chunk.content.platformContentId, chunk]),
    ).values(),
  ).slice(0, 2);
  const handle =
    partner.username ??
    contentPreviews.find(({ platform }) => platform.identifier)?.platform
      .identifier;

  return (
    <div className="border-border-subtle flex min-h-[360px] flex-col rounded-xl border bg-white">
      <div className="flex flex-1 flex-col p-4">
        <button
          type="button"
          className="w-fit text-left"
          onClick={() => onOpenPartner(partner.partnerId)}
        >
          {partner.image ? (
            <img
              src={partner.image}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="bg-bg-muted text-content-subtle flex size-16 items-center justify-center rounded-full text-lg font-semibold">
              {partner.name.charAt(0)}
            </div>
          )}
        </button>

        <div className="mt-4 min-w-0">
          <button
            type="button"
            className="text-content-emphasis max-w-full truncate text-left text-base font-semibold"
            onClick={() => onOpenPartner(partner.partnerId)}
          >
            {partner.name}
          </button>
          {handle && (
            <div className="text-content-subtle truncate text-sm">
              @{handle.replace(/^@/, "")}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3 text-sm">
          {hasQuery ? (
            <>
              <span className="text-content-emphasis font-semibold">
                {Math.round(partner.score * 100)}%
              </span>
              <span className="text-content-subtle">content match</span>
            </>
          ) : (
            <span className="text-content-subtle">Recent {label} content</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {contentPreviews.map((chunk) => {
            const thumbnail = getPreviewThumbnail(chunk, platform);

            return (
              <a
                key={chunk.chunkId}
                href={chunk.content.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={chunk.content.title ?? `Open ${label} content`}
                className="group relative overflow-hidden rounded-lg"
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover transition-transform duration-150 group-hover:scale-105"
                  />
                ) : (
                  <div className="bg-bg-muted aspect-square w-full rounded-lg" />
                )}
                {chunk.chunk.text && (
                  <div className="absolute inset-0 flex flex-col justify-between bg-black/75 p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <span className="w-fit rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {formatChunkTimeRange(chunk.chunk)}
                    </span>
                    <p className="line-clamp-5 text-xs leading-4 text-white">
                      {chunk.chunk.text}
                    </p>
                  </div>
                )}
              </a>
            );
          })}
          {contentPreviews.length === 1 && (
            <div className="aspect-square rounded-lg bg-transparent" />
          )}
        </div>

        {contentPreviews[0] && (
          <a
            href={contentPreviews[0].content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg-muted hover:bg-bg-subtle mt-4 flex min-w-0 items-center gap-2 rounded-lg p-2 transition-colors"
          >
            {partner.image ? (
              <img
                src={partner.image}
                alt=""
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <div className="size-5 rounded-full bg-neutral-200" />
            )}
            <span className="text-content-emphasis truncate text-sm font-medium">
              {contentPreviews[0].content.title ?? partner.name}
            </span>
          </a>
        )}
      </div>

      <div className="border-border-subtle flex gap-3 border-t p-3">
        <button
          type="button"
          className="border-border-subtle hover:bg-bg-muted flex size-9 items-center justify-center rounded-lg border bg-white transition-colors"
          aria-label={`Open ${partner.name}`}
          onClick={() => onOpenPartner(partner.partnerId)}
        >
          <ArrowUpRight className="text-content-subtle size-4" />
        </button>
        <Button
          type="button"
          variant="primary"
          text="Invite"
          icon={<EnvelopeArrowRight className="size-4" />}
          onClick={() => onOpenPartner(partner.partnerId)}
          className="h-9 flex-1 rounded-lg"
        />
      </div>
    </div>
  );
});

function formatChunkTimeRange({
  source,
  startMs,
  endMs,
}: PartnerContentSearchPartner["chunks"][number]["chunk"]) {
  if (source === "metadata") return "Description match";
  if (startMs === null && endMs === null) return "Transcript match";

  if (startMs !== null && endMs !== null) {
    return `${formatTimestamp(startMs)} - ${formatTimestamp(endMs)}`;
  }

  return formatTimestamp(startMs ?? endMs ?? 0);
}

function formatTimestamp(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getPreviewThumbnail(
  chunk: PartnerContentSearchPartner["chunks"][number],
  platform: PlatformType,
) {
  if (chunk.content.thumbnailUrl) return chunk.content.thumbnailUrl;

  // YouTube exposes a deterministic thumbnail URL from the video id; other
  // platforms don't, so fall back to a placeholder when there's no stored URL.
  if (platform === "youtube") {
    return `https://i.ytimg.com/vi/${chunk.content.platformContentId}/hqdefault.jpg`;
  }

  return null;
}
