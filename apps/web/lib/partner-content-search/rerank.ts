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
  const documents = candidates.map((row) =>
    (row.chunkText ?? "").slice(
      0,
      PARTNER_CONTENT_SEARCH_LIMITS.rerankerMaxDocChars,
    ),
  );

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

  // Reranked candidates sort ahead of the cosine-only tail (don't let an
  // un-reranked row leapfrog a reranked one on a different score scale).
  const reranked = [...rows].sort((a, b) => {
    const aReranked = a.rerankScore != null;
    const bReranked = b.rerankScore != null;
    if (aReranked !== bReranked) return aReranked ? -1 : 1;
    return effectiveRowScore(b) - effectiveRowScore(a);
  });

  return { rows: reranked, reranked: true };
}
