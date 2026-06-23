import {
  getBlendedTopContentScore,
  getViewBaseline,
} from "@/lib/partner-content-search/top-content-ranking";
import {
  type PartnerContentMatchEvidence,
  type PartnerContentSearchPartner,
} from "@/lib/swr/use-partner-content-search";

export const DETAIL_CONTENT_INITIAL_MATCH_COUNT = 8;
export const DETAIL_CONTENT_MATCH_INCREMENT = 8;

// A matched post for the detail lists: from the cached summary's bars, enriched
// with a loaded chunk (snippet, timed transcript, thumbnail) when available.
export type MatchedContentItem = {
  contentItemId: string;
  platform: string;
  platformContentId: string;
  title: string | null;
  url: string | null;
  durationMs: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  // The displayed relevance rating (0-1); also feeds the blend.
  relevance: number;
  // Relevance + reach blend, used only to order the Top content list.
  blendedScore: number;
  matchEvidence: PartnerContentMatchEvidence;
  chunk?: PartnerContentSearchPartner["chunks"][number];
};

export function getEvidenceDisplayScore(
  evidence: PartnerContentMatchEvidence | undefined,
) {
  if (!evidence || evidence.sources.length === 0) return null;

  return Math.max(
    evidence.transcriptScore ?? 0,
    evidence.creatorTextScore ?? 0,
  );
}

// Per-item relevance from the scoped reranked summary (one scale; the cached global
// summary mixes rerank + cosine). Includes any item with evidence, not just matched.
export function buildUnifiedRelevanceMap(
  relevanceSummary: PartnerContentSearchPartner["matchSummary"] | null | undefined,
) {
  const map = new Map<string, number>();
  for (const bar of relevanceSummary?.contentBars ?? []) {
    const score = getEvidenceDisplayScore(bar.matchEvidence);
    if (score != null) map.set(bar.partnerContentItemId, score);
  }
  return map;
}

export function buildMatchedContentItems(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
  chunks: PartnerContentSearchPartner["chunks"],
  unifiedRelevanceByItemId?: Map<string, number>,
): MatchedContentItem[] {
  const bars = summary?.contentBars ?? [];

  // Best loaded chunk per content item, for snippet/thumbnail enrichment.
  const chunkByContentItemId = new Map<
    string,
    PartnerContentSearchPartner["chunks"][number]
  >();
  for (const chunk of chunks) {
    const current = chunkByContentItemId.get(chunk.partnerContentItemId);
    if (!current || chunk.score > current.score) {
      chunkByContentItemId.set(chunk.partnerContentItemId, chunk);
    }
  }

  // Per-creator engagement baseline: median recent views (matched + unmatched).
  const baselineViews = getViewBaseline(bars.map((bar) => bar.viewCount));

  return bars
    .filter((bar) => bar.matched)
    .map((bar) => {
      // Prefer the unified single-scale relevance once the rerank lands; else cached.
      const relevance =
        unifiedRelevanceByItemId?.get(bar.partnerContentItemId) ??
        getEvidenceDisplayScore(bar.matchEvidence) ??
        bar.matchScore ??
        0;

      return {
        contentItemId: bar.partnerContentItemId,
        platform: bar.platform,
        platformContentId: bar.platformContentId,
        title: bar.title,
        url: bar.url,
        durationMs: bar.durationMs,
        publishedAt: bar.publishedAt,
        viewCount: bar.viewCount,
        relevance,
        blendedScore: getBlendedTopContentScore({
          relevance,
          views: bar.viewCount,
          baselineViews,
        }),
        matchEvidence: bar.matchEvidence,
        chunk: chunkByContentItemId.get(bar.partnerContentItemId),
      };
    });
}

export function publishedAtMs(iso: string | null) {
  if (!iso) return -Infinity;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}
