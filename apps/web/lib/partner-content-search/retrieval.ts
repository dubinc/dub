import { DubApiError } from "@/lib/api/errors";
import { DISCOVERABLE_NETWORK_STATUSES } from "@/lib/api/network/partner-network-listing-where";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { createHash } from "crypto";
import { PlatformType, Prisma } from "@prisma/client";
import {
  PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE,
  PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
  PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
} from "./constants";
import {
  getEvidenceSource,
  setSourceDistance,
  sortRowsByRelevanceScore,
  type SourceScoreByContentItemId,
} from "./ranking";
import { rerankPartnerSearchRows } from "./rerank";
import {
  dedupeBestChunkPerContentItem,
  dedupeBestChunkPerContentItemSource,
  type PartnerContentSearchRow,
} from "./search-utils";
import type { PartnerContentSearchTimingLogger } from "./timing";
import {
  embedPartnerContentTexts,
  serializeEmbeddingForVector,
  VoyageTimeoutError,
} from "./voyage";

// cache query embeddings for 60 days (query, embedding model). refresh on read
const QUERY_EMBEDDING_CACHE_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days

function queryEmbeddingCacheKey(query: string) {
  const digest = createHash("sha256").update(query).digest("hex").slice(0, 32);
  return `pcs:query-embedding:${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}:${digest}`;
}

async function readCachedQueryEmbedding(key: string) {
  try {
    // GETEX re-arms the TTL on every hit so frequently searched queries never expire.
    const cached = await redis.getex<number[]>(key, {
      ex: QUERY_EMBEDDING_CACHE_TTL_SECONDS,
    });
    return Array.isArray(cached) && cached.length ? cached : null;
  } catch {
    return null;
  }
}

function cacheQueryEmbedding(key: string, embedding: number[]) {
  // Fire-and-forget — never block the search on the cache write.
  redis
    .set(key, embedding, { ex: QUERY_EMBEDDING_CACHE_TTL_SECONDS })
    .catch(() => {});
}

type PartnerContentSearchCandidateRow = Pick<
  PartnerContentSearchRow,
  "chunkId" | "partnerContentItemId" | "chunkSource" | "distance"
>;

type PartnerContentSearchHydrationRow = Omit<
  PartnerContentSearchRow,
  "distance"
>;

export async function searchPartnerNetworkContent({
  programId,
  query,
  platforms,
  country,
  partnerIds,
  starred,
  limit,
  rerank,
  logTiming,
}: {
  programId: string;
  query: string;
  platforms?: PlatformType[];
  country?: string;
  partnerIds?: string[];
  starred?: boolean;
  limit: number;
  rerank: boolean;
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  const embeddingCacheKey = queryEmbeddingCacheKey(query);
  logTiming?.("query-embedding-start");
  let queryEmbedding: number[];
  const cachedEmbedding = await readCachedQueryEmbedding(embeddingCacheKey);
  if (cachedEmbedding) {
    queryEmbedding = cachedEmbedding;
    logTiming?.("query-embedding-cache-hit", {
      embeddingDimensions: queryEmbedding.length,
    });
  } else {
    try {
      [queryEmbedding] = await embedPartnerContentTexts({
        input: [query],
        inputType: "query",
        timeoutMs: PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
      });
    } catch (error) {
      if (error instanceof VoyageTimeoutError) {
        throw new DubApiError({
          code: "internal_server_error",
          message: "Partner content search timed out. Please try again.",
        });
      }
      throw error;
    }
    cacheQueryEmbedding(embeddingCacheKey, queryEmbedding);
    logTiming?.("query-embedding-complete", {
      embeddingDimensions: queryEmbedding.length,
    });
  }
  const queryVector = serializeEmbeddingForVector(queryEmbedding);

  // Eligibility filters inline in the ANN query; post-filtering would starve the candidate pool.
  const annFilters: Prisma.Sql[] = [
    Prisma.sql`AND NOT EXISTS (
      SELECT 1 FROM ProgramEnrollment pe
      WHERE pe.partnerId = c.partnerId AND pe.programId = ${programId}
    )`,
    Prisma.sql`AND NOT EXISTS (
      SELECT 1 FROM DiscoveredPartner dpi
      WHERE dpi.partnerId = c.partnerId AND dpi.programId = ${programId}
        AND dpi.ignoredAt IS NOT NULL
    )`,
  ];
  if (partnerIds?.length) {
    annFilters.push(Prisma.sql`AND c.partnerId IN (${Prisma.join(partnerIds)})`);
  }
  if (starred === true) {
    annFilters.push(Prisma.sql`AND EXISTS (
      SELECT 1 FROM DiscoveredPartner dps
      WHERE dps.partnerId = c.partnerId AND dps.programId = ${programId}
        AND dps.starredAt IS NOT NULL
    )`);
  } else if (starred === false) {
    annFilters.push(Prisma.sql`AND NOT EXISTS (
      SELECT 1 FROM DiscoveredPartner dps
      WHERE dps.partnerId = c.partnerId AND dps.programId = ${programId}
        AND dps.starredAt IS NOT NULL
    )`);
  }
  if (country) {
    annFilters.push(Prisma.sql`AND c.country = ${country}`);
  }
  if (platforms?.length) {
    annFilters.push(
      Prisma.sql`AND c.platformType IN (${Prisma.join(platforms)})`,
    );
  }
  const annFilter = Prisma.join(annFilters, " ");

  // Lean ANN query first (vector index), then hydrate chunk ids — joins stay off the vector path.
  const fetchCandidateChunks = (poolSize: number) =>
    prisma.$queryRaw<PartnerContentSearchCandidateRow[]>(Prisma.sql`
      SELECT
        c.id AS chunkId,
        c.partnerContentItemId,
        c.source AS chunkSource,
        DISTANCE(TO_VECTOR(${queryVector}), c.embedding, ${Prisma.raw(`'${PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE}'`)}) AS distance
      FROM PartnerContentChunk c FORCE INDEX (${Prisma.raw(PARTNER_CONTENT_CHUNK_VECTOR_INDEX)})
      WHERE c.embedding IS NOT NULL
        AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
        ${annFilter}
      ORDER BY distance ASC
      LIMIT ${poolSize}
    `);

  // Fixed pool size — ANN refills when eligibility filters skip near-neighbors.
  const poolSize = PARTNER_CONTENT_SEARCH_LIMITS.vectorSearchChunkPoolSize;
  logTiming?.("vector-search-start", {
    poolSize,
    retrievalShape: "ann-then-topk-hydrate",
  });

  const candidateRows = await fetchCandidateChunks(poolSize);
  logTiming?.("vector-candidate-search-complete", {
    candidateRowCount: candidateRows.length,
    poolSize,
    vectorIndex: PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
  });
  const sourceDeduped = dedupeBestChunkPerContentItemSource(candidateRows);

  // Reused by getPartnerMatchSummaries to gate matched posts without a second DISTANCE pass.
  const itemSourceBestDistance: SourceScoreByContentItemId = new Map();
  for (const row of sourceDeduped) {
    setSourceDistance(
      itemSourceBestDistance,
      row.partnerContentItemId,
      getEvidenceSource(row.chunkSource),
      Number(row.distance),
    );
  }

  // One best chunk per item for the cutoff; one per item+source for rerank/evidence.
  const itemRows = dedupeBestChunkPerContentItem(candidateRows).slice(0, limit);
  const candidateSourceRows = sourceDeduped.slice(
    0,
    Math.min(PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount, limit * 2),
  );

  // Match gate: worst distance among kept candidates (networkStatus drift dropped at hydrate).
  const cutoffDistance = itemRows.length
    ? Number(itemRows[itemRows.length - 1].distance)
    : null;
  logTiming?.("candidate-dedupe-complete", {
    candidateRowCount: candidateRows.length,
    sourceRowCount: candidateSourceRows.length,
    cutoffDistance,
  });

  const rows = await hydratePartnerContentSearchRows({
    candidateRows: candidateSourceRows,
    logTiming,
  });

  if (!rerank) {
    return {
      rows: sortRowsByRelevanceScore(rows),
      reranked: false,
      queryVector,
      cutoffDistance,
      itemSourceBestDistance,
    };
  }

  // reach/verified-platform filter at card hydration (post-rerank); pre-filtering risks ANN starvation.
  logTiming?.("rerank-start", {
    rowCount: rows.length,
    rerankerCandidateCount: Math.min(
      rows.length,
      PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount,
    ),
  });
  const rerankResult = await rerankPartnerSearchRows({
    query,
    rows,
  });
  logTiming?.("rerank-complete", {
    reranked: rerankResult.reranked,
    rowCount: rerankResult.rows.length,
    rerankedRowCount: rerankResult.rows.filter(
      ({ rerankScore }) => rerankScore != null,
    ).length,
  });
  return {
    // Don't re-sort — reranker order is intentional; blending scales would be wrong.
    ...rerankResult,
    queryVector,
    cutoffDistance,
    itemSourceBestDistance,
  };
}

async function hydratePartnerContentSearchRows({
  candidateRows,
  logTiming,
}: {
  candidateRows: PartnerContentSearchCandidateRow[];
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  if (candidateRows.length === 0) return [];

  const chunkIds = candidateRows.map(({ chunkId }) => chunkId);
  // networkStatus filtered post-ANN; catches status drift since embedding.
  const hydratedRows = await prisma.partnerContentChunk.findMany({
    where: {
      id: { in: chunkIds },
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
      partner: {
        networkStatus: { in: DISCOVERABLE_NETWORK_STATUSES },
      },
    },
    select: {
      id: true,
      partnerContentItemId: true,
      partnerId: true,
      source: true,
      startMs: true,
      endMs: true,
      chunkText: true,
      partnerContentItem: {
        select: {
          platformContentId: true,
          url: true,
          contentType: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          publishedAt: true,
          durationMs: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          saveCount: true,
          partnerPlatform: {
            select: {
              type: true,
              identifier: true,
            },
          },
        },
      },
    },
  });
  const hydratedByChunkId = new Map(
    hydratedRows.map(({ partnerContentItem: item, ...chunk }): [
      string,
      PartnerContentSearchHydrationRow,
    ] => [
      chunk.id,
      {
        chunkId: chunk.id,
        partnerContentItemId: chunk.partnerContentItemId,
        partnerId: chunk.partnerId,
        platformType: item.partnerPlatform.type,
        platformIdentifier: item.partnerPlatform.identifier,
        platformContentId: item.platformContentId,
        contentUrl: item.url,
        contentType: item.contentType,
        contentTitle: item.title,
        contentDescription: item.description,
        contentThumbnailUrl: item.thumbnailUrl,
        contentPublishedAt: item.publishedAt,
        contentDurationMs: item.durationMs,
        contentViewCount: item.viewCount,
        contentLikeCount: item.likeCount,
        contentCommentCount: item.commentCount,
        contentShareCount: item.shareCount,
        contentSaveCount: item.saveCount,
        chunkSource: chunk.source,
        chunkText: chunk.chunkText,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
      },
    ]),
  );
  const rows = candidateRows.flatMap<PartnerContentSearchRow>((candidate) => {
    const hydrated = hydratedByChunkId.get(candidate.chunkId);
    if (!hydrated) return [];

    return [
      {
        ...hydrated,
        distance: candidate.distance,
      },
    ];
  });
  logTiming?.("vector-candidate-hydration-complete", {
    candidateRowCount: candidateRows.length,
    hydratedRowCount: hydratedRows.length,
    filteredOutRowCount: candidateRows.length - rows.length,
  });

  return rows;
}
