// Shared helpers for the admin + network content search routes: per-partner
// grouping (each route passes its own toChunkResult) and reranking.

import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_RERANK_TIMEOUT_MS,
} from "./constants";
import {
  rerankPartnerContent,
  VoyageApiError,
  VoyageTimeoutError,
} from "./voyage";

export type PartnerContentSearchRow = {
  chunkId: string;
  partnerContentItemId: string;
  partnerId: string;
  partnerName: string;
  partnerUsername: string | null;
  partnerImage: string | null;
  partnerDescription: string | null;
  platformType: string;
  platformIdentifier: string;
  platformContentId: string;
  contentUrl: string;
  contentType: string;
  contentTitle: string | null;
  contentDescription?: string | null;
  contentThumbnailUrl: string | null;
  contentPublishedAt: Date | null;
  contentDurationMs: number | null;
  contentViewCount?: bigint | number | null;
  contentLikeCount?: bigint | number | null;
  contentCommentCount?: bigint | number | null;
  contentShareCount?: bigint | number | null;
  contentSaveCount?: bigint | number | null;
  chunkSource: string;
  // Only the admin query selects chunkIndex; the network query omits it.
  chunkIndex?: number;
  chunkText: string;
  startMs: number | null;
  endMs: number | null;
  distance: number | string;
  // Attached by the reranker (second stage); absent for cosine-only results.
  rerankScore?: number | null;
};

export function toScore(distance: number) {
  return Number((1 - distance).toFixed(6));
}

// Median of a numeric list (robust center; null when empty). `round` rounds the
// even-length average for display; leave it off when the value feeds further math.
export function median(
  values: number[],
  { round = false }: { round?: boolean } = {},
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) return sorted[mid];
  const average = (sorted[mid - 1] + sorted[mid]) / 2;
  return round ? Math.round(average) : average;
}

// Effective score: reranker relevance when present, else cosine similarity.
export function effectiveRowScore(row: PartnerContentSearchRow) {
  return row.rerankScore ?? toScore(Number(row.distance));
}

// Collapse a distance-ascending chunk pool to the best chunk per content item (first
// occurrence wins). Done in app code, not SQL, so a window-function dedup doesn't
// defeat the ANN index. Generic so it works pre- or post-hydration.
export function dedupeBestChunkPerContentItem<
  T extends { partnerContentItemId: string },
>(rows: T[]) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const row of rows) {
    if (seen.has(row.partnerContentItemId)) continue;
    seen.add(row.partnerContentItemId);
    deduped.push(row);
  }

  return deduped;
}

export function dedupeBestChunkPerContentItemSource<
  T extends { partnerContentItemId: string; chunkSource: string },
>(rows: T[]) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const row of rows) {
    const key = `${row.partnerContentItemId}:${row.chunkSource}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

export function groupPartnerSearchResults<TChunk>({
  rows,
  limit,
  chunksPerPartner,
  toChunkResult,
  dedupeKey,
  getRowScore = effectiveRowScore,
}: {
  rows: PartnerContentSearchRow[];
  limit: number;
  chunksPerPartner: number;
  toChunkResult: (row: PartnerContentSearchRow, distance: number) => TChunk;
  dedupeKey?: (row: PartnerContentSearchRow) => string;
  getRowScore?: (row: PartnerContentSearchRow) => number;
}) {
  const partners = new Map<
    string,
    {
      partnerId: string;
      name: string;
      username: string | null;
      image: string | null;
      description: string | null;
      score: number;
      cosineScore: number;
      rerankScore: number | null;
      chunks: TChunk[];
      chunkKeys: Set<string>;
    }
  >();

  for (const row of rows) {
    const distance = Number(row.distance);
    const cosineScore = toScore(distance);
    const rerankScore = row.rerankScore ?? null;
    const effectiveScore = getRowScore(row);

    const existing = partners.get(row.partnerId);
    const partner = existing ?? {
      partnerId: row.partnerId,
      name: row.partnerName,
      username: row.partnerUsername,
      image: row.partnerImage,
      description: row.partnerDescription,
      score: effectiveScore,
      cosineScore,
      rerankScore,
      chunks: [] as TChunk[],
      chunkKeys: new Set<string>(),
    };

    if (existing && effectiveScore > partner.score) {
      partner.score = effectiveScore;
      partner.cosineScore = cosineScore;
      partner.rerankScore = rerankScore;
    }

    const chunkKey = dedupeKey?.(row);
    const shouldAddChunk =
      partner.chunks.length < chunksPerPartner &&
      (!chunkKey || !partner.chunkKeys.has(chunkKey));

    if (shouldAddChunk) {
      partner.chunks.push(toChunkResult(row, distance));
      if (chunkKey) partner.chunkKeys.add(chunkKey);
    }

    partners.set(row.partnerId, partner);
  }

  return Array.from(partners.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunkKeys, ...partner }) => partner);
}

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
