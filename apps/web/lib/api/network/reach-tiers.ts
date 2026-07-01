// Audience-size tiers for partner discovery. Reach is the partner's max subscriber
// count across the selected platforms, so the filter composes with topic relevance
// and stays well-defined for any platform selection.

export const REACH_TIER_KEYS = [
  "nano",
  "micro",
  "mid",
  "macro",
  "mega",
] as const;

export type ReachTier = (typeof REACH_TIER_KEYS)[number];

// Display: the numeric `range` leads (objective, no "small = lesser" baggage) and
// the `descriptor` is a muted, all-positive secondary handle. The keys above stay
// as the stable URL/param values.
export const REACH_TIERS: Record<
  ReachTier,
  { range: string; descriptor: string; min: number; max: number | null }
> = {
  nano: { range: "Under 10K", descriptor: "Emerging", min: 0, max: 10_000 },
  micro: { range: "10K – 100K", descriptor: "Rising", min: 10_000, max: 100_000 },
  mid: {
    range: "100K – 500K",
    descriptor: "Established",
    min: 100_000,
    max: 500_000,
  },
  macro: {
    range: "500K – 1M",
    descriptor: "Leading",
    min: 500_000,
    max: 1_000_000,
  },
  mega: { range: "1M+", descriptor: "Flagship", min: 1_000_000, max: null },
};

const REACH_TIER_SET = new Set<string>(REACH_TIER_KEYS);

export function isReachTier(value: string | null | undefined): value is ReachTier {
  return Boolean(value && REACH_TIER_SET.has(value));
}

// Parse the comma-separated `reach` query param into valid tier keys (in canonical
// order, deduped). Absent/invalid → empty (no reach filter).
export function parseReachTiers(param: string | null | undefined): ReachTier[] {
  if (!param) return [];

  const selected = new Set(
    param
      .split(",")
      .map((value) => value.trim())
      .filter(isReachTier),
  );

  return REACH_TIER_KEYS.filter((key) => selected.has(key));
}

// Subscriber ranges (min inclusive, max exclusive; null max = unbounded) for the
// selected tiers — one entry per tier, OR'd together by callers.
export function reachTiersToRanges(
  tiers: ReachTier[],
): { min: number; max: number | null }[] {
  return tiers.map((tier) => {
    const { min, max } = REACH_TIERS[tier];
    return { min, max };
  });
}
