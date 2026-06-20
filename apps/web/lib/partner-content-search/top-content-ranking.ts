// Pure ranking helpers for the partner detail-pane "Top content" section.
//
// This module is intentionally dependency-free (only constants) so it can run on
// both the server and the client without dragging server-only code (voyage, db)
// into the client bundle. It blends a matched post's relevance with how well it
// performed (views), normalized per creator and robust to a single viral post.
//
// Scope note: this orders the "Top content" list only. It does not feed Topic
// Fit, the content-match bars, the X-of-Y counts, or partner ordering.

import { PARTNER_CONTENT_SEARCH_TOP_CONTENT } from "./constants";

// Median of a numeric list (robust center, unlike a mean which a viral outlier
// would drag upward). Returns null for an empty list.
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// The creator's "typical" view count, used as the engagement baseline. Computed
// over all of their recent posts (matched + unmatched) with real view data, so a
// single viral hit can't move it and posts aren't normalized against each other.
export function getViewBaseline(
  views: Array<number | null | undefined>,
): number | null {
  return median(
    views.filter((value): value is number => value != null && value > 0),
  );
}

// Maps a post's views to a [0,1] engagement score relative to the creator's
// median, on a log scale through a logistic squash:
//   - a median post scores ~0.5,
//   - a viral outlier saturates toward 1 (bounded, never dominates),
//   - a below-median post lands near 0 but is never negative (not punished).
// Returns null when there's no usable signal (no baseline, or no views on the
// post) so callers can fall back to pure relevance instead of guessing.
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

// Relevance-led blend used to order the "Top content" list. When there's no
// usable engagement signal (no creator baseline or no views on the post), this
// degrades gracefully to pure relevance so ranking never depends on view data
// being present.
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
