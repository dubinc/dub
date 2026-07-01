// Server-only second-stage reranking via the Voyage reranker. Kept separate from
// search-utils so the pure ranking/grouping helpers there stay client-safe (the
// content-search UI imports them transitively).
import "server-only";

import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_RERANK_TIMEOUT_MS,
} from "./constants";
import { effectiveRowScore, type PartnerContentSearchRow } from "./search-utils";
import {
  rerankPartnerContent,
  VoyageApiError,
  VoyageTimeoutError,
} from "./voyage";

// Re-score the top candidates with the Voyage reranker, sorted by effective score.
// Fails soft: on timeout/API error, returns the original cosine ordering.
export async function rerankPartnerSearchRows({
  query,
  rows,
}: {
  query: string;
  rows: PartnerContentSearchRow[];
}): Promise<{ rows: PartnerContentSearchRow[]; reranked: boolean }> {
  if (rows.length === 0) return { rows, reranked: false };

  // Only the top-N candidates are reranked, to bound payload/latency.
  const candidates = rows.slice(
    0,
    PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount,
  );
  const documentCharSafetyLimit =
    PARTNER_CONTENT_SEARCH_LIMITS.rerankerDocumentCharSafetyLimit;
  const documents = candidates.map(({ chunkText }) => {
    const document = chunkText ?? "";
    return document.length > documentCharSafetyLimit
      ? document.slice(0, documentCharSafetyLimit)
      : document;
  });

  try {
    const results = await rerankPartnerContent({
      query,
      documents,
      topK: candidates.length,
      timeoutMs: PARTNER_CONTENT_SEARCH_RERANK_TIMEOUT_MS,
    });

    for (const { index, relevanceScore } of results) {
      const row = candidates[index];
      if (row) row.rerankScore = relevanceScore;
    }
  } catch (error) {
    if (
      error instanceof VoyageTimeoutError ||
      error instanceof VoyageApiError
    ) {
      console.error(
        "[partner-content-search] reranker failed, falling back to cosine:",
        error.message,
      );
      return { rows, reranked: false };
    }
    throw error;
  }

  // Reranker-only ordering: return just the reranked candidates, sorted by their
  // calibrated relevance. We drop the un-reranked cosine tail (rows beyond
  // rerankerCandidateCount) rather than appending it — the cosine and rerank score
  // scales must never be blended in one ordering. The fail-soft path above returns
  // the full cosine ordering instead.
  const reranked = candidates
    .filter((row) => row.rerankScore != null)
    .sort((a, b) => effectiveRowScore(b) - effectiveRowScore(a));

  return { rows: reranked, reranked: true };
}
