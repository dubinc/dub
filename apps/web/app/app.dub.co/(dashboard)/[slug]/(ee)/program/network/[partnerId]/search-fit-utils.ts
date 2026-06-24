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

// Per-item relevance straight from the served chunks, on a single scale: rerank
// scores when the search reranked, cosine otherwise. The reranker already clips to
// its window and drops the cosine tail, so the two scales are never blended — and if
// the reranker failed, every row falls back to cosine together.
export function buildContentRelevanceMap(
  chunks: PartnerContentSearchPartner["chunks"],
  reranked: boolean,
) {
  const map = new Map<string, number>();
  for (const chunk of chunks) {
    const score = reranked ? chunk.rerankScore : chunk.cosineScore;
    if (score == null) continue;

    const current = map.get(chunk.partnerContentItemId);
    if (current == null || score > current) {
      map.set(chunk.partnerContentItemId, score);
    }
  }
  return map;
}

export function buildMatchedContentItems(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
  chunks: PartnerContentSearchPartner["chunks"],
  relevanceByItemId: Map<string, number>,
): MatchedContentItem[] {
  const matches = summary?.contentMatches ?? [];

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

  const baselineViews = getViewBaseline(matches.map((match) => match.viewCount));

  return matches
    .filter((match) => match.matched)
    .map((match): MatchedContentItem | null => {
      // Skip rows we can't render; matched count in the header still comes from all matched content.
      const chunk = bestChunkByContentItemId.get(match.partnerContentItemId);
      if (!chunk) return null;

      // Single-scale relevance from the served chunks; no cross-scale fallback.
      const relevance = relevanceByItemId.get(match.partnerContentItemId) ?? 0;

      return {
        contentItemId: match.partnerContentItemId,
        platform: match.platform,
        publishedAt: match.publishedAt,
        viewCount: match.viewCount,
        relevance,
        blendedScore: getBlendedTopContentScore({
          relevance,
          views: match.viewCount,
          baselineViews,
        }),
        matchEvidence: match.matchEvidence,
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
