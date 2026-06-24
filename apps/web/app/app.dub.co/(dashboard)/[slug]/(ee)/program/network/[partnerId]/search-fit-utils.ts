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
  for (const match of relevanceSummary?.contentMatches ?? []) {
    const score = getEvidenceDisplayScore(match.matchEvidence);
    if (score != null) map.set(match.partnerContentItemId, score);
  }
  return map;
}

export function buildMatchedContentItems(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
  chunks: PartnerContentSearchPartner["chunks"],
  unifiedRelevanceByItemId?: Map<string, number>,
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

      const relevance =
        unifiedRelevanceByItemId?.get(match.partnerContentItemId) ??
        getEvidenceDisplayScore(match.matchEvidence) ??
        match.matchScore ??
        0;

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
