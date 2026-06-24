import {
  getBlendedTopContentScore,
  getViewBaseline,
} from "@/lib/partner-content-search/top-content-ranking";
import {
  type PartnerContentMatchEvidence,
  type PartnerContentSearchPartner,
} from "@/lib/swr/use-partner-content-search";

export const DETAIL_CONTENT_INITIAL_DISPLAY_COUNT = 8;
export const DETAIL_CONTENT_PAGE_COUNT = 8;

export type MatchedContentItem = {
  contentItemId: string;
  platform: string;
  publishedAt: string | null;
  viewCount: number | null;
  relevance: number;
  blendedScore: number;
  matchEvidence: PartnerContentMatchEvidence;
  chunk: PartnerContentSearchPartner["chunks"][number];
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

// Per-item relevance on one scale from the scoped rerank (cached global summary mixes scales).
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

  const bestChunkByContentItemId = new Map<
    string,
    PartnerContentSearchPartner["chunks"][number]
  >();
  for (const chunk of chunks) {
    const current = bestChunkByContentItemId.get(chunk.partnerContentItemId);
    if (!current || isBetterDisplayChunk(chunk, current)) {
      bestChunkByContentItemId.set(chunk.partnerContentItemId, chunk);
    }
  }

  const baselineViews = getViewBaseline(bars.map((bar) => bar.viewCount));

  return bars
    .filter((bar) => bar.matched)
    .map((bar): MatchedContentItem | null => {
      // Skip rows we can't render; matched count in the header still comes from all matched bars.
      const chunk = bestChunkByContentItemId.get(bar.partnerContentItemId);
      if (!chunk) return null;

      const relevance =
        unifiedRelevanceByItemId?.get(bar.partnerContentItemId) ??
        getEvidenceDisplayScore(bar.matchEvidence) ??
        bar.matchScore ??
        0;

      return {
        contentItemId: bar.partnerContentItemId,
        platform: bar.platform,
        publishedAt: bar.publishedAt,
        viewCount: bar.viewCount,
        relevance,
        blendedScore: getBlendedTopContentScore({
          relevance,
          views: bar.viewCount,
          baselineViews,
        }),
        matchEvidence: bar.matchEvidence,
        chunk,
      };
    })
    .filter((item): item is MatchedContentItem => item !== null);
}

// Prefer transcript chunks for display enrichment (excerpt + timed link).
function isBetterDisplayChunk(
  candidate: PartnerContentSearchPartner["chunks"][number],
  current: PartnerContentSearchPartner["chunks"][number],
) {
  const candidateIsTranscript = candidate.chunk.source !== "metadata";
  const currentIsTranscript = current.chunk.source !== "metadata";
  if (candidateIsTranscript !== currentIsTranscript) return candidateIsTranscript;
  return candidate.score > current.score;
}

export function publishedAtMs(iso: string | null) {
  if (!iso) return -Infinity;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}
