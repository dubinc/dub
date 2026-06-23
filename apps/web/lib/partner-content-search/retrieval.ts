import { DubApiError } from "@/lib/api/errors";
import { DISCOVERABLE_NETWORK_STATUSES } from "@/lib/api/network/partner-network-listing-where";
import { prisma } from "@/lib/prisma";
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
  let queryEmbedding: number[];
  logTiming?.("query-embedding-start");
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
  logTiming?.("query-embedding-complete", {
    embeddingDimensions: queryEmbedding.length,
  });
  const queryVector = serializeEmbeddingForVector(queryEmbedding);

  // Push eligibility + user filters into the ANN (not after — post-filtering would
  // starve the candidate pool). Eligibility rides as fixed-shape semi/anti-joins
  // rather than materialized id-sets: the per-program enrolled/ignored/starred sets
  // grow unbounded (some programs enroll 1k+ partners), so a NOT IN literal would
  // balloon the SQL and can't reuse the cached plan. EXPLAIN confirms PlanetScale
  // materializes each subquery once and probes it by hash while keeping the vector
  // index (type=vector) under FORCE INDEX. networkStatus stays a post-filter since
  // ingestion already gates approved/trusted. country/platformType are denormalized
  // columns and partnerIds is a bounded UI selection, so those stay inline.
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
    // No starred partners → the EXISTS matches nothing → no candidates (intended).
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

  // Two-phase retrieval: keep the ANN flat so PlanetScale uses the vector index,
  // then hydrate only the returned chunk ids through the relational joins — keeping
  // the joins off the vector traversal path.
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

  // Fixed pool: the request-derived candidate count always resolves to the cap in
  // practice, and the ANN refills the pool from deeper in the ranking when eligibility
  // filters exclude near-neighbors (verified against PlanetScale SPANN), so there's no
  // need to size it per-request or widen it adaptively.
  const poolSize = PARTNER_CONTENT_SEARCH_LIMITS.vectorSearchChunkPoolSize;
  logTiming?.("vector-search-start", {
    poolSize,
    retrievalShape: "two-phase",
  });

  const candidateRows = await fetchCandidateChunks(poolSize);
  logTiming?.("vector-candidate-search-complete", {
    candidateRowCount: candidateRows.length,
    poolSize,
    vectorIndex: PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
  });
  // Dedup to the best chunk per item+source before the hydration join (filters are
  // per-item, so this is equivalent and keeps chunk-heavy items off the join).
  const dedupedCandidates = dedupeBestChunkPerContentItemSource(candidateRows);
  const poolRows = await hydratePartnerContentSearchRows({
    candidateRows: dedupedCandidates,
    logTiming,
  });
  logTiming?.("vector-search-complete", {
    candidateRowCount: candidateRows.length,
    poolRowCount: poolRows.length,
    poolSize,
    vectorIndex: PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
    retrievalShape: "two-phase",
  });

  // Best distance per item+source. getPartnerMatchSummaries reuses this to gate
  // matched recent posts instead of a second per-item DISTANCE pass — any item that
  // could clear the cutoff is already here (one missing is provably beyond it).
  const itemSourceBestDistance: SourceScoreByContentItemId = new Map();
  for (const row of poolRows) {
    setSourceDistance(
      itemSourceBestDistance,
      row.partnerContentItemId,
      getEvidenceSource(row.chunkSource),
      Number(row.distance),
    );
  }

  // One best chunk per item for the cutoff; one per item+source for rerank/evidence
  // (keeps metadata and transcript evidence separable).
  const itemRows = dedupeBestChunkPerContentItem(poolRows).slice(0, limit);
  const rows = dedupeBestChunkPerContentItemSource(poolRows).slice(
    0,
    Math.min(PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount, limit * 2),
  );

  // Cutoff = the least-relevant candidate kept; the match gate for recent posts.
  const cutoffDistance = itemRows.length
    ? Number(itemRows[itemRows.length - 1].distance)
    : null;
  logTiming?.("candidate-dedupe-complete", {
    itemRowCount: itemRows.length,
    sourceRowCount: rows.length,
    cutoffDistance,
  });

  const rowsWithChunkText = await hydratePartnerContentChunkText({
    rows,
    maxRows: rerank
      ? PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount
      : rows.length,
    logTiming,
  });

  if (!rerank) {
    return {
      rows: sortRowsByRelevanceScore(rowsWithChunkText),
      reranked: false,
      queryVector,
      cutoffDistance,
      itemSourceBestDistance,
    };
  }

  // NOTE: reach / verified-platform / conversion filters run downstream in
  // calculatePartnerRanking (via getNetworkPartnersById), after this rerank — so when
  // they're active we pay to rerank chunks from partners that get dropped later. Left
  // as-is on purpose: pre-filtering them here needs the canonical discover-eligibility
  // predicate that only exists once calculatePartnerRanking is split into hydrate-card
  // vs rank. Revisit at that consolidation.
  logTiming?.("rerank-start", {
    rowCount: rowsWithChunkText.length,
    rerankerCandidateCount: Math.min(
      rowsWithChunkText.length,
      PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount,
    ),
  });
  const rerankResult = await rerankPartnerSearchRows({
    query,
    rows: rowsWithChunkText,
  });
  logTiming?.("rerank-complete", {
    reranked: rerankResult.reranked,
    rowCount: rerankResult.rows.length,
    rerankedRowCount: rerankResult.rows.filter(
      ({ rerankScore }) => rerankScore != null,
    ).length,
  });
  return {
    // rerankResult.rows is already reranker-ordered on success, or the full cosine
    // ordering on fail-soft. Never re-sort here — sorting by effective score would
    // blend the rerank and cosine scales we just took care to keep separate.
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
  // Plain metadata fetch over already-eligible chunk ids (user/eligibility filters
  // ran inline in the ANN). networkStatus is the one remaining post-filter, via the
  // partner relation. chunkText is hydrated separately below, so we backfill "".
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
      partner: {
        select: {
          name: true,
          username: true,
          image: true,
          description: true,
        },
      },
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
    hydratedRows.map(({ partner, partnerContentItem: item, ...chunk }): [
      string,
      PartnerContentSearchHydrationRow,
    ] => [
      chunk.id,
      {
        chunkId: chunk.id,
        partnerContentItemId: chunk.partnerContentItemId,
        partnerId: chunk.partnerId,
        partnerName: partner.name,
        partnerUsername: partner.username,
        partnerImage: partner.image,
        partnerDescription: partner.description,
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
        chunkText: "",
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

async function hydratePartnerContentChunkText({
  rows,
  maxRows,
  logTiming,
}: {
  rows: PartnerContentSearchRow[];
  maxRows: number;
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  const rowsToHydrate = rows.slice(0, maxRows);
  const chunkIds = rowsToHydrate.map(({ chunkId }) => chunkId);

  if (chunkIds.length === 0) return rows;

  logTiming?.("chunk-text-hydration-start", {
    requestedRowCount: rowsToHydrate.length,
    totalRowCount: rows.length,
  });
  const chunkTextRows = await prisma.partnerContentChunk.findMany({
    where: {
      id: {
        in: chunkIds,
      },
    },
    select: {
      id: true,
      chunkText: true,
    },
  });
  const chunkTextById = new Map(
    chunkTextRows.map((row) => [row.id, row.chunkText]),
  );
  logTiming?.("chunk-text-hydration-complete", {
    hydratedRowCount: chunkTextById.size,
  });

  return rows.map((row, index) =>
    index < maxRows
      ? {
          ...row,
          chunkText: chunkTextById.get(row.chunkId) ?? row.chunkText,
        }
      : row,
  );
}
