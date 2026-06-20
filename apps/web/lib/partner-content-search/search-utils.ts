// Shared helpers for the partner content search routes (admin + network).
// Both routes run the same raw vector query and group rows by partner; only the
// per-chunk shape differs, so each route passes its own `toChunkResult` mapper.

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
  chunkSource: string;
  // Only the admin query selects chunkIndex; the network query omits it.
  chunkIndex?: number;
  chunkText: string;
  startMs: number | null;
  endMs: number | null;
  distance: number | string;
  // Set by the reranker (second stage) when it runs; absent for cosine-only
  // results. `rerankPartnerSearchRows` mutates rows in place to attach it.
  rerankScore?: number | null;
};

export function toScore(distance: number) {
  return Number((1 - distance).toFixed(6));
}

// The score used for ranking + display: the reranker's relevance score when
// present, otherwise cosine similarity (1 - cosine distance).
export function effectiveRowScore(row: PartnerContentSearchRow) {
  return row.rerankScore ?? toScore(Number(row.distance));
}

// Collapse a flat, distance-ascending chunk pool to the single best chunk per
// content item. Because rows are sorted best-first, the first occurrence of each
// content item is its best chunk. This turns a top-k *chunk* pool into a per-video
// candidate set in app code, avoiding a SQL window-function dedup that would force
// a full distance scan and defeat the ANN vector index.
export function dedupeBestChunkPerContentItem(rows: PartnerContentSearchRow[]) {
  const seen = new Set<string>();
  const deduped: PartnerContentSearchRow[] = [];

  for (const row of rows) {
    if (seen.has(row.partnerContentItemId)) continue;
    seen.add(row.partnerContentItemId);
    deduped.push(row);
  }

  return deduped;
}

export function dedupeBestChunkPerContentItemSource(
  rows: PartnerContentSearchRow[],
) {
  const seen = new Set<string>();
  const deduped: PartnerContentSearchRow[] = [];

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

// Re-score the top vector-search candidates with the Voyage reranker. Mutates
// rows in place to attach `rerankScore`, then returns them sorted by effective
// score (rerank when present) descending. Fails *soft*: on a reranker timeout or
// API error it logs and returns the original cosine ordering, so the second-stage
// call can never break search; it can only improve it.
export async function rerankPartnerSearchRows({
  query,
  rows,
}: {
  query: string;
  rows: PartnerContentSearchRow[];
}): Promise<{ rows: PartnerContentSearchRow[]; reranked: boolean }> {
  if (rows.length === 0) return { rows, reranked: false };

  // Only the top-N cosine candidates are reranked, to bound the rerank payload
  // (and latency). Rows beyond the cap keep their cosine score.
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

  // Reranked candidates always sort ahead of the cosine-only tail (rows beyond
  // the rerank cap): their cosine score was already higher, and we don't want a
  // weak un-reranked row leapfrogging a reranked one on a different score scale.
  const reranked = [...rows].sort((a, b) => {
    const aReranked = a.rerankScore != null;
    const bReranked = b.rerankScore != null;
    if (aReranked !== bReranked) return aReranked ? -1 : 1;
    return effectiveRowScore(b) - effectiveRowScore(a);
  });

  return { rows: reranked, reranked: true };
}
