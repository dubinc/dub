// Pure ranking helpers for the partner detail-pane "Top content" list. Dependency-
// free (constants only) so it stays client-safe — no server-only code (voyage, db)
// in the bundle. Orders that list only; never feeds Topic Fit, the coverage summary, or counts.

import { PARTNER_CONTENT_SEARCH_TOP_CONTENT } from "./constants";
import { median } from "./search-utils";

// Creator's "typical" view count (median over recent posts with view data), used as
// the engagement baseline — robust to a single viral hit.
export function getViewBaseline(
  views: Array<number | null | undefined>,
): number | null {
  return median(
    views.filter((value): value is number => value != null && value > 0),
  );
}

// Maps a post's views to a [0,1] engagement score vs. the creator's median, via a
// log-scale logistic: median ~0.5, viral saturates toward 1, below-median near 0
// (never negative). Null when there's no usable signal (no baseline or no views).
export function getEngagementScore({
  views,
  baselineViews,
}: {
  views: number | null | undefined;
  baselineViews: number | null | undefined;
}): number | null {
  if (baselineViews == null || baselineViews <= 0) return null;
  if (views == null || views <= 0) return null;

  const { engagementLogSpread } = PARTNER_CONTENT_SEARCH_TOP_CONTENT;
  const z =
    (Math.log10(1 + views) - Math.log10(1 + baselineViews)) /
    engagementLogSpread;

  return 1 / (1 + Math.exp(-z));
}

// Relevance-led blend ordering the "Top content" list; degrades to pure relevance
// when there's no engagement signal.
export function getBlendedTopContentScore({
  relevance,
  views,
  baselineViews,
}: {
  relevance: number;
  views: number | null | undefined;
  baselineViews: number | null | undefined;
}): number {
  const engagement = getEngagementScore({ views, baselineViews });
  if (engagement == null) return relevance;

  const { relevanceWeight, engagementWeight } =
    PARTNER_CONTENT_SEARCH_TOP_CONTENT;

  return relevanceWeight * relevance + engagementWeight * engagement;
}
