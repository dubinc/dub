// Pure (client-safe) helpers for the admin + network content search routes:
// per-partner grouping (each route passes its own toChunkResult), candidate
// sizing, and score utilities. Server-only reranking lives in ./rerank.

import { PARTNER_CONTENT_SEARCH_LIMITS } from "./constants";

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

// How many candidate chunks to retrieve to satisfy `limit` partners at
// `chunksPerPartner` each. Query mode over-fetches (×6, floored at 25, capped at
// the candidate ceiling) so reranking + topic-fit have a deep pool to work from;
// list mode has no relevance gate, so a smaller pool (×2) suffices.
export function getCandidateChunkCount({
  hasQuery,
  limit,
  chunksPerPartner,
}: {
  hasQuery: boolean;
  limit: number;
  chunksPerPartner: number;
}) {
  if (!hasQuery) return limit * chunksPerPartner * 2;

  return Math.min(
    PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount,
    Math.max(25, limit * chunksPerPartner * 6),
  );
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
