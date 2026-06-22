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

// Resolves a program's partner-eligibility sets for inline ANN pre-filtering:
// the deny-set (enrolled ∪ ignored partners) excluded from every query, plus the
// starred set the starred filter includes/excludes. All are per-program and bounded
// by the program's roster, so they ride into the flat ANN as id-set predicates
// without dragging the relational joins onto the vector-index traversal path.
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
  // Resolve the program's partner-eligibility sets in parallel with the query
  // embedding — they need only programId, so they run under the Voyage round-trip
  // and add little to no incremental time delay. (PrismaPromise.all kicks the queries off
  // synchronously here, before we await the embedding below.)
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

  // Pre-filter eligibility + user filters INLINE on the flat ANN (no joins): exclude
  // the program's enrolled + ignored partners, honor explicit partnerIds, apply the
  // starred filter, and apply the country/platform user filters via the denormalized
  // c.country / c.platformType columns. Pre-filtering (vs. the old post-hydration
  // filter) keeps these from biasing/starving the candidate pool — enrolled partners
  // are exactly a program's strongest matches, so post-filtering them silently
  // dropped the best results as a program matured. networkStatus stays a post-filter
  // (non-selective: ingestion only embeds approved/trusted partners).
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

  // Retrieval is split into two bounded phases. First, keep the ANN query flat so
  // PlanetScale can use the vector index for a small chunk-candidate pool. Then
  // hydrate/filter only those chunk ids through the relational partner/platform
  // joins below. This keeps the expensive joins off the vector traversal path.
  // The cheap phase also returns the content-item id + source so we can dedup to
  // the best chunk per item+source BEFORE the join (see retrievePool).
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

  // Dedup to the best chunk per content-item + source BEFORE the relational
  // hydration join. The post-ANN filters are all per-item/per-partner, so the
  // surviving items are identical whether we filter-then-dedup or dedup-then-
  // filter; this just keeps chunk-heavy items from sending redundant rows through
  // the 5-way join. itemRows (cutoff) and rows (rerank) are both derived from the
  // per-item+source set below, so nothing downstream changes.
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

  // Eligibility + user filters run INLINE in the ANN, so the pool comes back
  // already eligible; networkStatus is the only remaining post-ANN filter and it's
  // non-selective (ingestion gates on approved/trusted), so the hydrated pool rarely
  // shrinks. Keep a one-shot expansion as a safety net for the rare case it does
  // (e.g. a cluster of demoted partners): if we under-filled and the ANN hadn't
  // exhausted the index (it returned a full pool), widen to the cap once and retry.
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

  // Best cosine distance per content-item + evidence source across the candidate
  // pool. getPartnerMatchSummaries reuses this to gate which recent posts count as
  // "matched" instead of recomputing DISTANCE per item in SQL: cutoffDistance is
  // itself a pool item's distance, so any item that could clear it is already in
  // this map (an item missing here is provably beyond the cutoff — not matched).
  const itemSourceBestDistance: SourceScoreByContentItemId = new Map();
  for (const row of poolRows) {
    setSourceDistance(
      itemSourceBestDistance,
      row.partnerContentItemId,
      getEvidenceSource(row.chunkSource),
      Number(row.distance),
    );
  }

  // Collapse to one best chunk per content item for the item-level cutoff, and
  // one best chunk per content item + source for reranking/source-aware evidence.
  // This keeps metadata and transcript evidence separable without letting one
  // chunk-heavy video flood the candidate pool.
  const itemRows = dedupeBestChunkPerContentItem(poolRows).slice(0, limit);
  const rows = dedupeBestChunkPerContentItemSource(poolRows).slice(
    0,
    Math.min(PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount, limit * 2),
  );

  // Cosine-distance cutoff = the least-relevant candidate kept. getPartnerMatchSummaries
  // uses this to decide which of a partner's recent videos count as "matched" (i.e.
  // at least as relevant as the weakest video in the candidate pool), computed
  // exactly per item, independent of which raw chunk survived the global cap.
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
  // Eligibility + user filters (enrolled/ignored/starred/country/platform) are all
  // pre-filtered in the ANN now, so hydration is a plain metadata fetch over
  // already-eligible chunk ids. networkStatus is the one remaining post-filter
  // (cheap and non-selective — see the search query note); the partner/platform
  // joins stay only to supply display columns and that networkStatus check.

  // Plain relational hydration over an already-eligible chunk-id set: the inner
  // joins in the prior raw form were pure filters (all relations are required
  // FKs), and the lone post-ANN predicate, networkStatus, maps to the partner
  // relation filter below. `chunkText` is deliberately not selected here (it's
  // hydrated separately in hydratePartnerContentChunkText); we backfill the ""
  // placeholder when flattening to the row shape.
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
