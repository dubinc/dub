"use client";

import { type PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { cn } from "@dub/utils";

// Single coverage summary bar from summary counts (strong / partial / no match).
const SEGMENTS = [
  { key: "strong", label: "Strong", color: "bg-[#1D9E75]" },
  { key: "partial", label: "Partial", color: "bg-[#EF9F27]" },
  { key: "none", label: "No match", color: "bg-neutral-300" },
] as const;

export function CoverageSummaryBar({
  summary,
}: {
  summary: PartnerContentSearchPartner["matchSummary"] | undefined;
}) {
  if (!summary || !summary.recentContentCount) return null;

  const {
    recentContentCount,
    matchedContentCount,
    strongMatchedContentCount,
    partialMatchedContentCount,
  } = summary;
  const noMatchCount = Math.max(0, recentContentCount - matchedContentCount);

  const counts: Record<(typeof SEGMENTS)[number]["key"], number> = {
    strong: strongMatchedContentCount,
    partial: partialMatchedContentCount,
    none: noMatchCount,
  };

  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {SEGMENTS.filter(({ key }) => counts[key] > 0).map(({ key, color }) => (
          <div
            key={key}
            className={color}
            style={{ width: `${(counts[key] / recentContentCount) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-content-subtle mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
        {SEGMENTS.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm", color)} />
            {label} {counts[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
