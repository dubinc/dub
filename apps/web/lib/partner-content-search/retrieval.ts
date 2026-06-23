import { DubApiError } from "@/lib/api/errors";
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
import {
  dedupeBestChunkPerContentItem,
  dedupeBestChunkPerContentItemSource,
  rerankPartnerSearchRows,
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

function getVectorSearchChunkPoolSize(limit: number) {
  return Math.max(
    limit,
    Math.min(
      PARTNER_CONTENT_SEARCH_LIMITS.vectorSearchChunkPoolMaxSize,
      limit * PARTNER_CONTENT_SEARCH_LIMITS.vectorSearchChunkPoolMultiplier,
    ),
  );
}

function countDistinctContentItems(rows: { partnerContentItemId: string }[]) {
  return new Set(rows.map(({ partnerContentItemId }) => partnerContentItemId))
    .size;
}

// Partner-eligibility id-sets for inline ANN pre-filtering: the deny-set
// (enrolled ∪ ignored) excluded from every query, plus the starred set.
async function resolveProgramPartnerEligibility({
  programId,
  starred,
  logTiming,
}: {
  programId: string;
  starred?: boolean;
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  const [enrolledRows, ignoredRows, starredRows] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { programId },
      select: { partnerId: true },
    }),
    prisma.discoveredPartner.findMany({
      where: { programId, ignoredAt: { not: null } },
      select: { partnerId: true },
    }),
    // Only needed when the starred filter is active.
    starred !== undefined
      ? prisma.discoveredPartner.findMany({
          where: { programId, starredAt: { not: null } },
          select: { partnerId: true },
        })
      : Promise.resolve<{ partnerId: string }[]>([]),
  ]);

  const excludedPartnerIds = [
    ...new Set([
      ...enrolledRows.map(({ partnerId }) => partnerId),
      ...ignoredRows.map(({ partnerId }) => partnerId),
    ]),
  ];
  const starredPartnerIds = [
    ...new Set(starredRows.map(({ partnerId }) => partnerId)),
  ];

  logTiming?.("partner-eligibility-resolved", {
    enrolledCount: enrolledRows.length,
    ignoredCount: ignoredRows.length,
    excludedPartnerCount: excludedPartnerIds.length,
    starredPartnerCount: starredPartnerIds.length,
  });

  return { excludedPartnerIds, starredPartnerIds };
}

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
  // Runs under the Voyage embedding round-trip (needs only programId), so the
  // eligibility queries add ~no latency.
  const eligibilityPromise = resolveProgramPartnerEligibility({
    programId,
    starred,
    logTiming,
  });

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
  const eligibility = await eligibilityPromise;

  // Eligibility + user filters are applied INLINE on the flat ANN (country/platform
  // via the denormalized c.country / c.platformType columns). Post-filtering would
  // starve the candidate pool — enrolled partners are a program's strongest matches.
  // networkStatus stays a post-filter (ingestion already gates approved/trusted).
  const annFilters: Prisma.Sql[] = [];
  if (eligibility.excludedPartnerIds.length > 0) {
    annFilters.push(
      Prisma.sql`AND c.partnerId NOT IN (${Prisma.join(eligibility.excludedPartnerIds)})`,
    );
  }
  if (partnerIds?.length) {
    annFilters.push(Prisma.sql`AND c.partnerId IN (${Prisma.join(partnerIds)})`);
  }
  if (starred === true) {
    // starred filter on with no starred partners → no eligible candidates.
    annFilters.push(
      eligibility.starredPartnerIds.length > 0
        ? Prisma.sql`AND c.partnerId IN (${Prisma.join(eligibility.starredPartnerIds)})`
        : Prisma.sql`AND 1 = 0`,
    );
  } else if (starred === false && eligibility.starredPartnerIds.length > 0) {
    annFilters.push(
      Prisma.sql`AND c.partnerId NOT IN (${Prisma.join(eligibility.starredPartnerIds)})`,
    );
  }
  if (country) {
    annFilters.push(Prisma.sql`AND c.country = ${country}`);
  }
  if (platforms?.length) {
    annFilters.push(
      Prisma.sql`AND c.platformType IN (${Prisma.join(platforms)})`,
    );
  }
  const annFilter =
    annFilters.length > 0 ? Prisma.join(annFilters, " ") : Prisma.empty;

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

  // Dedup to the best chunk per item+source before the hydration join (filters are
  // per-item, so this is equivalent and keeps chunk-heavy items off the join).
  const retrievePool = async (poolSize: number) => {
    const candidateRows = await fetchCandidateChunks(poolSize);
    logTiming?.("vector-candidate-search-complete", {
      candidateRowCount: candidateRows.length,
      poolSize,
      vectorIndex: PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
    });
    const dedupedCandidates =
      dedupeBestChunkPerContentItemSource(candidateRows);
    const poolRows = await hydratePartnerContentSearchRows({
      candidateRows: dedupedCandidates,
      logTiming,
    });
    return { candidateRowCount: candidateRows.length, poolRows };
  };

  const initialPoolSize = getVectorSearchChunkPoolSize(limit);
  const maxPoolSize = PARTNER_CONTENT_SEARCH_LIMITS.vectorSearchChunkPoolMaxSize;
  logTiming?.("vector-search-start", {
    poolSize: initialPoolSize,
    maxPoolSize,
    retrievalShape: "two-phase",
  });

  let poolSize = initialPoolSize;
  let { candidateRowCount, poolRows } = await retrievePool(poolSize);

  // The pool comes back already eligible (filters run inline), so it rarely shrinks.
  // Safety net for when it does (e.g. a cluster of demoted partners): if we
  // under-filled but the ANN returned a full pool, widen to the cap once and retry.
  let distinctItemCount = countDistinctContentItems(poolRows);
  if (
    poolSize < maxPoolSize &&
    candidateRowCount === poolSize &&
    distinctItemCount < limit
  ) {
    poolSize = maxPoolSize;
    logTiming?.("vector-search-pool-expanded", {
      previousPoolSize: initialPoolSize,
      poolSize,
      distinctItemCount,
      limit,
    });
    ({ candidateRowCount, poolRows } = await retrievePool(poolSize));
    distinctItemCount = countDistinctContentItems(poolRows);
  }
  logTiming?.("vector-search-complete", {
    candidateRowCount,
    poolRowCount: poolRows.length,
    distinctItemCount,
    poolSize,
    expanded: poolSize !== initialPoolSize,
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
    Math.min(PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount, limit * 2),
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
    ...rerankResult,
    rows: sortRowsByRelevanceScore(rerankResult.rows),
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
        networkStatus: { in: ["approved", "trusted"] },
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

// Single-phase admin diagnostics query: one raw ANN with inline hydration, no
// eligibility/network pre-filtering (intentionally searches the full corpus).
export async function searchAdminPartnerContentChunks({
  queryVector,
  limit,
  partnerIds,
  platform,
}: {
  queryVector: string;
  limit: number;
  partnerIds?: string[];
  platform?: PlatformType;
}) {
  const partnerFilter = partnerIds?.length
    ? Prisma.sql`AND c.partnerId IN (${Prisma.join(partnerIds)})`
    : Prisma.empty;
  const platformFilter = platform
    ? Prisma.sql`AND pp.type = ${platform}`
    : Prisma.empty;

  return await prisma.$queryRaw<PartnerContentSearchRow[]>(Prisma.sql`
    SELECT
      c.id AS chunkId,
      c.partnerContentItemId,
      c.partnerId,
      p.name AS partnerName,
      p.username AS partnerUsername,
      p.image AS partnerImage,
      p.description AS partnerDescription,
      pp.type AS platformType,
      pp.identifier AS platformIdentifier,
      pci.platformContentId,
      pci.url AS contentUrl,
      pci.contentType,
      pci.title AS contentTitle,
      pci.thumbnailUrl AS contentThumbnailUrl,
      pci.publishedAt AS contentPublishedAt,
      pci.durationMs AS contentDurationMs,
      c.source AS chunkSource,
      c.chunkIndex,
      c.chunkText,
      c.startMs,
      c.endMs,
      DISTANCE(TO_VECTOR(${queryVector}), c.embedding, ${Prisma.raw(`'${PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE}'`)}) AS distance
    FROM PartnerContentChunk c
    INNER JOIN PartnerContentItem pci ON pci.id = c.partnerContentItemId
    INNER JOIN Partner p ON p.id = c.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    WHERE c.embedding IS NOT NULL
      AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
      ${partnerFilter}
      ${platformFilter}
    ORDER BY distance ASC
    LIMIT ${limit}
  `);
}
