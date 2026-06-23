"use client";

import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { Tooltip } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { useState } from "react";
import {
  formatDuration,
  formatPublishedDate,
} from "../content-display-utils";
import { PlatformIcon } from "../platform-icon";

// Per-post match bars: height = match magnitude, color = platform. Muted, evenly-
// weighted palette so platforms read as a calm spectrum (none looks like a non-match).
const PLATFORM_BAR_COLORS: Record<string, string> = {
  youtube: "bg-[#bd8488]",
  instagram: "bg-[#b083a2]",
  tiktok: "bg-[#74a09a]",
  twitter: "bg-[#8589b3]",
  x: "bg-[#8589b3]",
  linkedin: "bg-[#7c9cbd]",
  website: "bg-[#bda77c]",
};

// Glanceable recent-activity strip, capped to the most-recent N so columns stay
// hoverable. Topic Fit + the "X of Y" counts still use the full server-side set.
const MAX_VISIBLE_CONTENT_BARS = 40;

export function ContentMatchBars({
  summary,
}: {
  summary: PartnerContentSearchPartner["matchSummary"] | undefined;
}) {
  // One open tooltip at a time — driving every bar's open state from one value
  // prevents a fast cursor flick leaving several open.
  const [openBarId, setOpenBarId] = useState<string | null>(null);

  const allBars = summary?.contentBars ?? [];
  if (!allBars.length) return null;
  const bars = allBars.slice(0, MAX_VISIBLE_CONTENT_BARS);

  return (
    <div
      className="mt-2.5 flex h-9 items-end gap-[3px]"
      onPointerLeave={() => setOpenBarId(null)}
    >
      {bars.map((bar) => {
        const score =
          bar.matched && bar.matchScore != null
            ? Math.min(1, Math.max(0, bar.matchScore))
            : 0;
        // Magnitude → height (matched posts get a floor so they stay legible).
        const height = bar.matched ? Math.round(10 + score * 26) : 5;
        const isCreatorTextOnlyVideoMatch =
          bar.matchEvidence.primarySource === "creatorText" &&
          bar.matchEvidence.weight < 1;
        // The whole column is the hover/click target (easier to land on); on hover
        // a gold wash fills it and the bar turns gold.
        const columnClassName = cn(
          "group flex h-full min-w-[5px] flex-1 items-end rounded-[3px] transition-colors duration-75 hover:bg-amber-100/70",
          bar.url && "cursor-pointer",
        );
        const fill = (
          <span
            style={{ height }}
            className={cn(
              "w-full rounded-full transition-[height,background-color] duration-75",
              bar.matched
                ? cn(
                    PLATFORM_BAR_COLORS[bar.platform] ?? "bg-[#94a3b8]",
                    isCreatorTextOnlyVideoMatch && "opacity-55",
                  )
                : "bg-neutral-200",
              "group-hover:bg-amber-400 group-hover:opacity-100",
            )}
          />
        );

        return (
          <Tooltip
            key={bar.partnerContentItemId}
            content={<BarTooltip bar={bar} />}
            // Snappy bar-to-bar hover: open instantly, no grace area, no close animation.
            delayDuration={0}
            disableHoverableContent
            disableAnimation
            open={openBarId === bar.partnerContentItemId}
            onOpenChange={(nextOpen) =>
              setOpenBarId((current) =>
                nextOpen
                  ? bar.partnerContentItemId
                  : current === bar.partnerContentItemId
                    ? null
                    : current,
              )
            }
          >
            {bar.url ? (
              <a
                href={bar.url}
                target="_blank"
                rel="noopener noreferrer"
                className={columnClassName}
                aria-label={bar.title ?? "Open post"}
              >
                {fill}
              </a>
            ) : (
              <div className={columnClassName}>{fill}</div>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}

// Hover card for a content bar: platform, title, date · length · views (all cached).
function BarTooltip({
  bar,
}: {
  bar: NonNullable<
    PartnerContentSearchPartner["matchSummary"]
  >["contentBars"][number];
}) {
  const title = bar.title?.trim() || "Untitled content";
  const meta = [
    formatPublishedDate(bar.publishedAt),
    formatDuration(bar.durationMs),
    bar.viewCount && bar.viewCount > 0
      ? `${nFormatter(bar.viewCount)} views`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-[240px] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <PlatformIcon platform={bar.platform} className="size-3.5 shrink-0" />
        <span className="text-content-emphasis line-clamp-2 text-xs font-semibold">
          {title}
        </span>
      </div>
      {meta && (
        <div className="text-content-subtle mt-1 text-[11px]">{meta}</div>
      )}
    </div>
  );
}
