import { DubApiError } from "@/lib/api/errors";
import { calculatePartnerRanking } from "@/lib/api/network/calculate-partner-ranking";
import { parseRankedNetworkPartners } from "@/lib/api/network/normalize-ranked-network-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE,
  PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
  PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MAX_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_MODELS,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
  PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
} from "@/lib/partner-content-search/constants";
import {
  createContentMatchEvidence,
  deriveTopicFit,
  getEntityCreatorTextBoost,
  getEntityTranscriptScore,
  getEvidenceMatchScore,
  getEvidenceTopicScore,
  getEvidenceSource,
  getMatchedSourceScore,
  getPartnerContentSearchQuerySignals,
  getRowRelevanceScore,
  getSourceScore,
  hasExactQueryMention,
  maxNullableScore,
  setSourceDistance,
  setSourceScore,
  sortRowsByRelevanceScore,
  type PartnerContentMatchEvidence,
  type PartnerContentMatchSource,
  type PartnerContentSearchQuerySignals,
} from "@/lib/partner-content-search/ranking";
import {
  dedupeBestChunkPerContentItem,
  dedupeBestChunkPerContentItemSource,
  groupPartnerSearchResults,
  rerankPartnerSearchRows,
  toScore,
  type PartnerContentSearchRow,
} from "@/lib/partner-content-search/search-utils";
import {
  embedPartnerContentTexts,
  serializeEmbeddingForVector,
  VoyageTimeoutError,
} from "@/lib/partner-content-search/voyage";
import { REACH_TIER_KEYS, type ReachTier } from "@/lib/api/network/reach-tiers";
import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_PARTNER_LIMIT = 20;
const MIN_PARTNER_CONTENT_SEARCH_TIMING_DELTA_MS = 5;
const PARTNER_CONTENT_SEARCH_ALWAYS_LOG_TIMING_STAGES = new Set([
  "query-embedding-complete",
  "partner-eligibility-resolved",
  "vector-candidate-search-complete",
  "vector-candidate-hydration-complete",
  "vector-search-pool-expanded",
  "vector-search-complete",
  "candidate-dedupe-complete",
  "chunk-text-hydration-complete",
  "rerank-complete",
  "partner-candidates-grouped",
  "match-summary-base-queries-complete",
  "match-summary-content-counts-complete",
  "match-summary-recent-content-complete",
  "match-summary-followers-complete",
  "match-summary-aggregation-complete",
  "partner-hydration-complete",
  "response-ready",
]);

type PartnerContentSearchTimingLogger = (
  stage: string,
  metadata?: Record<string, unknown>,
) => void;

type SourceScoreByContentItemId = Map<
  string,
  Map<PartnerContentMatchSource, number>
>;

type PartnerContentSearchCandidateRow = Pick<
  PartnerContentSearchRow,
  "chunkId" | "partnerContentItemId" | "chunkSource" | "distance"
>;

type PartnerContentSearchHydrationRow = Omit<
  PartnerContentSearchRow,
  "distance"
>;

const partnerNetworkContentSearchSchema = z.object({
  query: z.string().trim().max(500).optional(),
  platforms: z.array(z.enum(PlatformType)).min(1).optional(),
  reach: z.array(z.enum(REACH_TIER_KEYS)).min(1).optional(),
  country: z.string().trim().min(1).optional(),
  partnerIds: z.array(z.string()).min(1).max(100).optional(),
  starred: z.boolean().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_PARTNER_LIMIT)
    .default(DEFAULT_PARTNER_LIMIT),
  chunksPerPartner: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_MAX_CHUNKS_PER_PARTNER)
    .default(PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER),
  candidateChunkCount: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount)
    .optional(),
  // Second-stage reranking is on by default; pass `false` for diagnostics.
  rerank: z.boolean().default(true),
});

// POST /api/network/partners/content-search - semantic search over indexed partner content
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerNetworkEnabledAt } = await prisma.program.findUniqueOrThrow({
      select: {
        partnerNetworkEnabledAt: true,
      },
      where: {
        id: programId,
      },
    });

    if (!partnerNetworkEnabledAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });
    }

    const body = partnerNetworkContentSearchSchema.parse(
      await parseRequestBody(req),
    );
    const candidateChunkCount = body.query
      ? body.candidateChunkCount ??
        Math.min(
          PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount,
          Math.max(25, body.limit * body.chunksPerPartner * 6),
        )
      : body.limit * body.chunksPerPartner * 2;
    const logTiming = createPartnerContentSearchTimingLogger({
      workspaceId: workspace.id,
      programId,
      hasQuery: Boolean(body.query),
      queryLength: body.query?.length ?? 0,
      platforms: body.platforms ?? null,
      reach: body.reach ?? null,
      country: body.country ?? null,
      starred: body.starred ?? null,
      limit: body.limit,
      chunksPerPartner: body.chunksPerPartner,
      candidateChunkCount,
      rerank: body.rerank,
    });

    logTiming("request-parsed");

    const { rows, reranked, queryVector, cutoffDistance, itemSourceBestDistance } =
      body.query
        ? await searchPartnerNetworkContent({
            programId,
            query: body.query,
            platforms: body.platforms,
            country: body.country,
            partnerIds: body.partnerIds,
            starred: body.starred,
            limit: candidateChunkCount,
            rerank: body.rerank,
            logTiming,
          })
        : {
            rows: await listPartnerNetworkContent({
              programId,
              platforms: body.platforms,
              country: body.country,
              partnerIds: body.partnerIds,
              starred: body.starred,
              limit: candidateChunkCount,
            }),
            reranked: false,
            queryVector: null,
            cutoffDistance: null,
            itemSourceBestDistance: undefined,
          };
    logTiming("content-rows-loaded", {
      rowCount: rows.length,
      reranked,
      cutoffDistance,
    });
    const partnerCandidateLimit = body.query
      ? Math.min(
          PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
          Math.max(body.limit, body.limit * 3),
        )
      : body.limit;
    const partnerCandidates = groupPartnerSearchResults({
      rows,
      limit: partnerCandidateLimit,
      chunksPerPartner: body.chunksPerPartner,
      toChunkResult,
      dedupeKey: ({ partnerContentItemId }) => partnerContentItemId,
      getRowScore: getRowRelevanceScore,
    });
    logTiming("partner-candidates-grouped", {
      partnerCandidateCount: partnerCandidates.length,
      partnerCandidateLimit,
    });
    logTiming("match-summaries-start", {
      partnerCandidateCount: partnerCandidates.length,
    });
    const matchSummaries = await getPartnerMatchSummaries({
      rows,
      partnerIds: partnerCandidates.map(({ partnerId }) => partnerId),
      platforms: body.platforms,
      query: body.query,
      queryVector,
      cutoffDistance,
      itemSourceBestDistance,
      logTiming,
    });
    logTiming("match-summaries-complete", {
      summaryCount: matchSummaries.size,
    });
    logTiming("partner-hydration-start", {
      partnerCandidateCount: partnerCandidates.length,
    });
    const networkPartners = await getNetworkPartnersById({
      programId,
      partnerIds: partnerCandidates.map(({ partnerId }) => partnerId),
      platforms: body.platforms,
      reach: body.reach,
      country: body.country,
      starred: body.starred,
    });
    logTiming("partner-hydration-complete", {
      hydratedPartnerCount: networkPartners.size,
    });
    const partners = partnerCandidates
      .map((partner) => {
        const networkPartner = networkPartners.get(partner.partnerId);
        if (!networkPartner) return null;

        return {
          ...partner,
          partner: networkPartner,
          matchSummary: matchSummaries.get(partner.partnerId) ?? null,
        };
      })
      .filter(isNonNull);
    const sortedPartners = body.query
      ? sortPartnersByTopicFit(partners)
      : partners;
    logTiming("response-ready", {
      returnedPartnerCount: Math.min(sortedPartners.length, body.limit),
    });

    return NextResponse.json({
      success: true,
      query: body.query ?? null,
      platforms: body.platforms ?? null,
      country: body.country ?? null,
      candidateChunkCount,
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
      reranked,
      rerankModel: reranked
        ? PARTNER_CONTENT_SEARCH_MODELS.reranker.model
        : null,
      resultCount: rows.length,
      partners: sortedPartners.slice(0, body.limit),
    });
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);

function createPartnerContentSearchTimingLogger(
  context: Record<string, unknown>,
): PartnerContentSearchTimingLogger {
  const startedAt = Date.now();
  let previousAt = startedAt;

  return (stage, metadata = {}) => {
    const now = Date.now();
    const elapsedMs = now - startedAt;
    const deltaMs = now - previousAt;
    previousAt = now;

    if (
      deltaMs < MIN_PARTNER_CONTENT_SEARCH_TIMING_DELTA_MS &&
      !PARTNER_CONTENT_SEARCH_ALWAYS_LOG_TIMING_STAGES.has(stage)
    ) {
      return;
    }

    console.info("[partner-content-search:timing]", {
      stage,
      elapsedMs,
      deltaMs,
      ...context,
      ...metadata,
    });
  };
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

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

function sortPartnersByTopicFit<
  T extends {
    score: number;
    matchSummary: {
      topicFit: number;
      weightedMatchedContentScore: number;
      weightedMatchedContentCount: number;
      transcriptMatchedContentCount: number;
      matchedContentCount: number;
      followers: number | null;
    } | null;
  },
>(partners: T[]) {
  return [...partners].sort((a, b) => {
    const aSummary = a.matchSummary;
    const bSummary = b.matchSummary;

    return (
      (bSummary?.topicFit ?? 0) - (aSummary?.topicFit ?? 0) ||
      (bSummary?.weightedMatchedContentScore ?? 0) -
        (aSummary?.weightedMatchedContentScore ?? 0) ||
      (bSummary?.weightedMatchedContentCount ?? 0) -
        (aSummary?.weightedMatchedContentCount ?? 0) ||
      (bSummary?.transcriptMatchedContentCount ?? 0) -
        (aSummary?.transcriptMatchedContentCount ?? 0) ||
      (bSummary?.matchedContentCount ?? 0) -
        (aSummary?.matchedContentCount ?? 0) ||
      b.score - a.score ||
      (bSummary?.followers ?? 0) - (aSummary?.followers ?? 0)
    );
  });
}

async function getNetworkPartnersById({
  programId,
  partnerIds,
  platforms,
  reach,
  country,
  starred,
}: {
  programId: string;
  partnerIds: string[];
  platforms?: PlatformType[];
  reach?: ReachTier[];
  country?: string;
  starred?: boolean;
}) {
  if (partnerIds.length === 0) return new Map();

  const rankedPartners = await calculatePartnerRanking({
    programId,
    partnerIds,
    status: "discover",
    page: 1,
    pageSize: partnerIds.length,
    country,
    starred: starred ?? undefined,
    platform: platforms,
    reach,
  });
  const partners = parseRankedNetworkPartners(rankedPartners);

  return new Map(partners.map((partner) => [partner.id, partner]));
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

async function searchPartnerNetworkContent({
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

async function listPartnerNetworkContent({
  programId,
  platforms,
  country,
  partnerIds,
  starred,
  limit,
}: {
  programId: string;
  platforms?: PlatformType[];
  country?: string;
  partnerIds?: string[];
  starred?: boolean;
  limit: number;
}) {
  const discoveredFilters: Prisma.PartnerWhereInput[] = [
    {
      discoveredByPrograms: {
        none: {
          programId,
          ignoredAt: {
            not: null,
          },
        },
      },
    },
  ];

  if (starred === true) {
    discoveredFilters.push({
      discoveredByPrograms: {
        some: {
          programId,
          starredAt: {
            not: null,
          },
        },
      },
    });
  } else if (starred === false) {
    discoveredFilters.push({
      discoveredByPrograms: {
        none: {
          programId,
          starredAt: {
            not: null,
          },
        },
      },
    });
  }

  const contentItems = await prisma.partnerContentItem.findMany({
    where: {
      ...(partnerIds?.length && {
        partnerId: {
          in: partnerIds,
        },
      }),
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
      embeddedChunkCount: {
        gt: 0,
      },
      ...(platforms?.length && {
        partnerPlatform: {
          type: { in: platforms },
        },
      }),
      partner: {
        networkStatus: {
          in: ["approved", "trusted"],
        },
        ...(country && { country }),
        programs: {
          none: {
            programId,
          },
        },
        AND: discoveredFilters,
      },
    },
    select: {
      id: true,
      partnerId: true,
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
      partner: {
        select: {
          name: true,
          username: true,
          image: true,
          description: true,
        },
      },
      partnerPlatform: {
        select: {
          type: true,
          identifier: true,
        },
      },
      chunks: {
        where: {
          embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
        },
        select: {
          id: true,
          source: true,
        },
        orderBy: {
          id: "asc",
        },
        take: 1,
      },
    },
    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    take: limit,
  });

  return contentItems.flatMap<PartnerContentSearchRow>((contentItem) => {
    const chunk = contentItem.chunks[0];
    if (!chunk) return [];

    return {
      chunkId: chunk.id,
      partnerContentItemId: contentItem.id,
      partnerId: contentItem.partnerId,
      partnerName: contentItem.partner.name,
      partnerUsername: contentItem.partner.username,
      partnerImage: contentItem.partner.image,
      partnerDescription: contentItem.partner.description,
      platformType: contentItem.partnerPlatform.type,
      platformIdentifier: contentItem.partnerPlatform.identifier,
      platformContentId: contentItem.platformContentId,
      contentUrl: contentItem.url,
      contentType: contentItem.contentType,
      contentTitle: contentItem.title,
      contentDescription: contentItem.description,
      contentThumbnailUrl: contentItem.thumbnailUrl,
      contentPublishedAt: contentItem.publishedAt,
      contentDurationMs: contentItem.durationMs,
      contentViewCount: contentItem.viewCount,
      contentLikeCount: contentItem.likeCount,
      contentCommentCount: contentItem.commentCount,
      contentShareCount: contentItem.shareCount,
      contentSaveCount: contentItem.saveCount,
      chunkSource: chunk.source,
      chunkText: "",
      startMs: null,
      endMs: null,
      distance: 0,
    };
  });
}

type PartnerRecentContentBarRow = {
  partnerId: string;
  partnerContentItemId: string;
  platformType: string;
  platformContentId: string;
  contentType: string;
  contentTitle: string | null;
  contentDescription: string | null;
  contentUrl: string | null;
  contentDurationMs: number | null;
  transcriptFetchStatus: string | null;
  publishedAt: Date | null;
  viewCount: bigint | number | null;
  likeCount: bigint | number | null;
  commentCount: bigint | number | null;
  shareCount: bigint | number | null;
  saveCount: bigint | number | null;
  rowNumber: bigint | number;
};

type PartnerContentItemBestMatch = {
  transcriptScore: number | null;
  creatorTextScore: number | null;
};

type PartnerContentMatchBar = {
  partnerContentItemId: string;
  platform: string;
  platformContentId: string;
  title: string | null;
  url: string | null;
  durationMs: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  saveCount: number | null;
  matched: boolean;
  matchScore: number | null;
  matchEvidence: PartnerContentMatchEvidence;
};

type QueryContentMatchContext = {
  querySignals: PartnerContentSearchQuerySignals;
  cutoffDistance?: number | null;
  recentItemSourceBestDistance: SourceScoreByContentItemId;
  rerankByItemSource: SourceScoreByContentItemId;
};

type ListContentMatchContext = {
  bestMatchByContentItemId: Map<string, PartnerContentItemBestMatch>;
};

type ContentMatchContext = QueryContentMatchContext | ListContentMatchContext;

// Median of a numeric list (robust to viral outliers vs. a mean). Returns null
// for an empty list so callers can omit the signal when there's no data.
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function groupRowsBy<T, K>(rows: T[], getKey: (row: T) => K) {
  const rowsByKey = new Map<K, T[]>();

  for (const row of rows) {
    const key = getKey(row);
    const group = rowsByKey.get(key) ?? [];
    group.push(row);
    rowsByKey.set(key, group);
  }

  return rowsByKey;
}

function getBestMatchByContentItemId(rows: PartnerContentSearchRow[]) {
  const bestMatchByContentItemId = new Map<
    string,
    PartnerContentItemBestMatch
  >();

  for (const row of rows) {
    // Use the effective score (rerank when present) so the content-match bars
    // stay consistent with the reranked partner ordering.
    const score = row.rerankScore ?? toScore(Number(row.distance));
    const evidenceSource = getEvidenceSource(row.chunkSource);
    const existing = bestMatchByContentItemId.get(row.partnerContentItemId);
    const next = existing ?? {
      transcriptScore: null,
      creatorTextScore: null,
    };

    if (evidenceSource === "transcript") {
      next.transcriptScore =
        next.transcriptScore == null
          ? score
          : Math.max(next.transcriptScore, score);
    } else {
      next.creatorTextScore =
        next.creatorTextScore == null
          ? score
          : Math.max(next.creatorTextScore, score);
    }

    bestMatchByContentItemId.set(row.partnerContentItemId, next);
  }

  return bestMatchByContentItemId;
}

function getQueryContentMatch({
  row,
  context,
}: {
  row: PartnerRecentContentBarRow;
  context: QueryContentMatchContext;
}) {
  // On-topic gate: prefer the reranker's calibrated relevance, which cleanly
  // separates on- from off-topic. Fall back to the cosine cutoff only for items
  // the reranker didn't score (rerank disabled/failed, or the item never reached
  // the candidate pool).
  const transcriptScore = getEntityTranscriptScore({
    currentScore: getMatchedSourceScore({
      rerankScore: getSourceScore(
        context.rerankByItemSource,
        row.partnerContentItemId,
        "transcript",
      ),
      bestDistance: getSourceScore(
        context.recentItemSourceBestDistance,
        row.partnerContentItemId,
        "transcript",
      ),
      cutoffDistance: context.cutoffDistance,
    }),
    // Transcript-level substring matching was removed from the search path; only
    // title/description exact mentions (computed in memory below) feed scoring now.
    hasExactQueryMention: false,
    queryIntent: context.querySignals.intent,
  });
  const vectorCreatorTextScore = getMatchedSourceScore({
    rerankScore: getSourceScore(
      context.rerankByItemSource,
      row.partnerContentItemId,
      "creatorText",
    ),
    bestDistance: getSourceScore(
      context.recentItemSourceBestDistance,
      row.partnerContentItemId,
      "creatorText",
    ),
    cutoffDistance: context.cutoffDistance,
  });
  const titleHasExactQueryMention = hasExactQueryMention(
    row.contentTitle,
    context.querySignals,
  );
  const descriptionHasExactQueryMention = hasExactQueryMention(
    row.contentDescription,
    context.querySignals,
  );
  const creatorTextBoost = getEntityCreatorTextBoost({
    platformType: row.platformType,
    contentType: row.contentType,
    transcriptFetchStatus: row.transcriptFetchStatus,
    titleHasExactQueryMention,
    descriptionHasExactQueryMention,
    // Chunk-level substring matching was removed from the search path (see above).
    chunkHasExactQueryMention: false,
    transcriptScore,
    queryIntent: context.querySignals.intent,
  });
  const creatorTextScore = maxNullableScore(
    vectorCreatorTextScore,
    creatorTextBoost?.score,
  );

  const matchEvidence = createContentMatchEvidence({
    contentType: row.contentType,
    transcriptScore,
    creatorTextScore,
    creatorTextWeightOverride: creatorTextBoost?.weight,
  });

  return {
    matchEvidence,
    matchScore: getEvidenceMatchScore(matchEvidence),
  };
}

function getListContentMatch({
  row,
  context,
}: {
  row: PartnerRecentContentBarRow;
  context: ListContentMatchContext;
}) {
  const match = context.bestMatchByContentItemId.get(row.partnerContentItemId);
  const matchEvidence = createContentMatchEvidence({
    contentType: row.contentType,
    transcriptScore: match?.transcriptScore ?? null,
    creatorTextScore: match?.creatorTextScore ?? null,
  });

  return {
    matchEvidence,
    matchScore: getEvidenceMatchScore(matchEvidence),
  };
}

function toContentMatchBar({
  row,
  context,
}: {
  row: PartnerRecentContentBarRow;
  context: ContentMatchContext;
}): PartnerContentMatchBar {
  const { matchEvidence, matchScore } =
    "bestMatchByContentItemId" in context
      ? getListContentMatch({ row, context })
      : getQueryContentMatch({ row, context });
  const matched = matchEvidence.sources.length > 0;

  return {
    partnerContentItemId: row.partnerContentItemId,
    platform: row.platformType,
    platformContentId: row.platformContentId,
    title: row.contentTitle,
    url: row.contentUrl,
    durationMs:
      row.contentDurationMs != null ? Number(row.contentDurationMs) : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    viewCount: row.viewCount != null ? Number(row.viewCount) : null,
    likeCount: row.likeCount != null ? Number(row.likeCount) : null,
    commentCount: row.commentCount != null ? Number(row.commentCount) : null,
    shareCount: row.shareCount != null ? Number(row.shareCount) : null,
    saveCount: row.saveCount != null ? Number(row.saveCount) : null,
    matched,
    matchScore,
    matchEvidence,
  };
}

function getContentBarMatchStats(contentBars: PartnerContentMatchBar[]) {
  const matchedBars = contentBars.filter((bar) => bar.matched);
  const matchedContentCount = matchedBars.length;
  const transcriptMatchedContentCount = contentBars.filter(
    ({ matchEvidence }) => matchEvidence.sources.includes("transcript"),
  ).length;
  const creatorTextMatchedContentCount = contentBars.filter(
    ({ matchEvidence }) => matchEvidence.sources.includes("creatorText"),
  ).length;
  const creatorTextOnlyContentCount = contentBars.filter(
    ({ matchEvidence }) =>
      matchEvidence.primarySource === "creatorText" &&
      matchEvidence.sources.length === 1,
  ).length;
  const weightedMatchedContentCount = Number(
    contentBars
      .reduce((total, bar) => total + bar.matchEvidence.weight, 0)
      .toFixed(3),
  );
  const weightedMatchedContentScore = Number(
    contentBars
      .reduce(
        (total, bar) => total + (getEvidenceTopicScore(bar.matchEvidence) ?? 0),
        0,
      )
      .toFixed(3),
  );

  return {
    matchedBars,
    matchedContentCount,
    transcriptMatchedContentCount,
    creatorTextMatchedContentCount,
    creatorTextOnlyContentCount,
    weightedMatchedContentCount,
    weightedMatchedContentScore,
  };
}

async function getPartnerMatchSummaries({
  rows,
  partnerIds,
  platforms,
  query,
  queryVector,
  cutoffDistance,
  itemSourceBestDistance,
  logTiming,
}: {
  rows: PartnerContentSearchRow[];
  partnerIds: string[];
  platforms?: PlatformType[];
  query?: string | null;
  // Present only in query mode. When set, each shown partner's recent videos are
  // counted as matched when at least as relevant as the weakest candidate
  // (cutoffDistance). When null (list mode) we fall back to the retrieval rows for
  // the match determination.
  queryVector?: string | null;
  cutoffDistance?: number | null;
  // Best cosine distance per content-item + source across the candidate pool,
  // computed once during retrieval. Reused here to gate matched recent content
  // without a second per-item DISTANCE pass (any item that clears the cutoff is
  // already in this map — see the producer in searchPartnerNetworkContent).
  itemSourceBestDistance?: SourceScoreByContentItemId;
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  if (partnerIds.length === 0) return new Map<string, null>();

  const querySignals = getPartnerContentSearchQuerySignals(query);
  const platformFilter = platforms?.length
    ? Prisma.sql`AND pp.type IN (${Prisma.join(platforms)})`
    : Prisma.empty;

  // "Recent" is a time window (last recencyWindowMonths), not a fixed post count.
  // A count window means wildly different time spans per creator (a daily poster's
  // 28 posts span a month; a monthly poster's span 2+ years), so coverage over it
  // conflates active and dormant creators. A time window normalizes that and keeps
  // every platform with content in the period (incl. ones the creator has since
  // moved on from; those still count toward topical authority).
  const recencyCutoff = new Date();
  recencyCutoff.setMonth(
    recencyCutoff.getMonth() -
      PARTNER_CONTENT_SEARCH_LIMITS.recencyWindowMonths,
  );

  // These three reads are independent, so issue them as one parallel wave rather
  // than three serial round trips. (Prisma promises are lazy and don't execute
  // until awaited, so they fan out together under the Promise.all below.)
  const contentCountsPromise = prisma.partnerContentItem
    .groupBy({
      by: ["partnerId"],
      where: {
        partnerId: {
          in: partnerIds,
        },
        embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
        embeddedChunkCount: {
          gt: 0,
        },
        ...(platforms?.length && {
          partnerPlatform: {
            type: { in: platforms },
          },
        }),
      },
      _count: {
        _all: true,
      },
      _min: {
        publishedAt: true,
      },
      _max: {
        publishedAt: true,
      },
    })
    .then((contentCounts) => {
      logTiming?.("match-summary-content-counts-complete", {
        contentCountRows: contentCounts.length,
      });
      return contentCounts;
    });

  const recentContentRowsPromise = prisma
    .$queryRaw<PartnerRecentContentBarRow[]>(
      Prisma.sql`
        SELECT
          partnerId,
          partnerContentItemId,
          platformType,
          platformContentId,
          contentType,
          contentTitle,
          contentDescription,
          contentUrl,
          contentDurationMs,
          transcriptFetchStatus,
          publishedAt,
          viewCount,
          likeCount,
          commentCount,
          shareCount,
          saveCount,
          rowNumber
        FROM (
          SELECT
            pci.partnerId,
            pci.id AS partnerContentItemId,
            pp.type AS platformType,
            pci.platformContentId,
            pci.contentType,
            pci.title AS contentTitle,
            pci.description AS contentDescription,
            pci.url AS contentUrl,
            pci.durationMs AS contentDurationMs,
            pci.transcriptFetchStatus,
            pci.publishedAt,
            pci.viewCount,
            pci.likeCount,
            pci.commentCount,
            pci.shareCount,
            pci.saveCount,
            ROW_NUMBER() OVER (
              PARTITION BY pci.partnerId
              ORDER BY pci.publishedAt DESC, pci.createdAt DESC, pci.id ASC
            ) AS rowNumber
          FROM PartnerContentItem pci
          INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
          WHERE pci.partnerId IN (${Prisma.join(partnerIds)})
            ${platformFilter}
            AND (
              pci.publishedAt >= ${recencyCutoff}
              OR (pci.publishedAt IS NULL AND pci.createdAt >= ${recencyCutoff})
            )
            AND pci.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
            AND pci.embeddedChunkCount > 0
        ) recentContent
        WHERE rowNumber <= ${PARTNER_CONTENT_SEARCH_LIMITS.recentContentMaxPerPartner}
        ORDER BY partnerId ASC, rowNumber ASC
      `,
    )
    .then((recentContentRows) => {
      logTiming?.("match-summary-recent-content-complete", {
        recentContentRows: recentContentRows.length,
      });
      return recentContentRows;
    });

  // Reach: total followers across the partner's platforms (or just the filtered
  // platform). The single signal brands most want and the card wasn't showing.
  const followerRowsPromise = prisma.partnerPlatform
    .groupBy({
      by: ["partnerId"],
      where: {
        partnerId: {
          in: partnerIds,
        },
        ...(platforms?.length && {
          type: { in: platforms },
        }),
      },
      _sum: {
        subscribers: true,
      },
    })
    .then((followerRows) => {
      logTiming?.("match-summary-followers-complete", {
        followerRows: followerRows.length,
      });
      return followerRows;
    });

  logTiming?.("match-summary-base-queries-start", {
    partnerCount: partnerIds.length,
  });
  const [contentCounts, recentContentRows, followerRows] = await Promise.all([
    contentCountsPromise,
    recentContentRowsPromise,
    followerRowsPromise,
  ]);
  logTiming?.("match-summary-base-queries-complete", {
    contentCountRows: contentCounts.length,
    recentContentRows: recentContentRows.length,
    followerRows: followerRows.length,
  });
  const followersByPartner = new Map(
    followerRows.map((row) => [
      row.partnerId,
      row._sum.subscribers != null ? Number(row._sum.subscribers) : 0,
    ]),
  );

  const countByPartnerId = new Map(
    contentCounts.map((row) => [row.partnerId, row]),
  );
  const rowsByPartnerId = groupRowsBy(rows, ({ partnerId }) => partnerId);
  const recentRowsByPartnerId = groupRowsBy(
    recentContentRows,
    ({ partnerId }) => partnerId,
  );

  // Query mode only: gate which of each shown partner's recent videos count as
  // "matched". A recent video is matched when its best chunk is at least as
  // relevant as the weakest candidate (cutoffDistance). Because cutoffDistance is
  // itself a candidate-pool item's distance, every recent video that could clear
  // it is already in itemSourceBestDistance — so we reuse that map instead of
  // re-running a per-item DISTANCE pass over the recent set. A recent video absent
  // from the map is provably beyond the cutoff (not matched).
  const recentItemSourceBestDistance =
    queryVector && itemSourceBestDistance
      ? itemSourceBestDistance
      : new Map<string, Map<PartnerContentMatchSource, number>>();

  // Calibrated reranker score per item + source (from the candidate pool), used
  // to gate which recent posts count as on-topic.
  const rerankByItemSource: SourceScoreByContentItemId = new Map();
  for (const row of rows) {
    if (row.rerankScore != null) {
      setSourceScore(
        rerankByItemSource,
        row.partnerContentItemId,
        getEvidenceSource(row.chunkSource),
        row.rerankScore,
      );
    }
  }

  const queryMatchContext: QueryContentMatchContext | null = queryVector
    ? {
        querySignals,
        cutoffDistance,
        recentItemSourceBestDistance,
        rerankByItemSource,
      }
    : null;

  logTiming?.("match-summary-aggregation-start", {
    partnerCount: partnerIds.length,
    recentContentRows: recentContentRows.length,
  });
  const summaries = new Map(
    partnerIds.map((partnerId) => {
      const partnerRows = rowsByPartnerId.get(partnerId) ?? [];
      const recentRows = recentRowsByPartnerId.get(partnerId) ?? [];
      const countRow = countByPartnerId.get(partnerId);
      const totalContentCount = countRow ? countRow._count._all : 0;
      const bestMatchByContentItemId = getBestMatchByContentItemId(partnerRows);
      const contentMatchContext: ContentMatchContext = queryMatchContext ?? {
        bestMatchByContentItemId,
      };
      const contentBars = recentRows.map((row) =>
        toContentMatchBar({
          row,
          context: contentMatchContext,
        }),
      );
      const {
        matchedBars,
        matchedContentCount,
        transcriptMatchedContentCount,
        creatorTextMatchedContentCount,
        creatorTextOnlyContentCount,
        weightedMatchedContentCount,
        weightedMatchedContentScore,
      } = getContentBarMatchStats(contentBars);
      const recentContentCount = contentBars.length;
      const { topicFit, band } = deriveTopicFit({
        matchedContentCount,
        weightedMatchedContentCount,
        weightedMatchedContentScore,
        recentContentCount,
      });
      // Brand-facing signals over the on-topic posts: typical reach (median views,
      // robust to a viral outlier) and how recently they last posted on topic.
      const medianViews = median(
        matchedBars
          .map((bar) => bar.viewCount)
          .filter((views): views is number => views != null && views > 0),
      );
      const matchedTimestamps = matchedBars
        .map((bar) => bar.publishedAt)
        .filter((publishedAt): publishedAt is string => Boolean(publishedAt))
        .map((publishedAt) => new Date(publishedAt).getTime());
      const lastOnTopicAt = matchedTimestamps.length
        ? new Date(Math.max(...matchedTimestamps)).toISOString()
        : null;
      const followers = followersByPartner.get(partnerId) ?? null;
      // Top platforms ranked by matched-post frequency, falling back to all recent
      // posts when nothing matched (so the card can still show a platform).
      const platformFrequency = new Map<string, number>();
      for (const bar of matchedBars.length ? matchedBars : contentBars) {
        platformFrequency.set(
          bar.platform,
          (platformFrequency.get(bar.platform) ?? 0) + 1,
        );
      }
      const topPlatforms = Array.from(platformFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([platform]) => platform);
      const publishedDates = contentBars
        .map(({ publishedAt }) => (publishedAt ? new Date(publishedAt) : null))
        .filter((date): date is Date => Boolean(date));
      const oldestPublishedAt = publishedDates.length
        ? new Date(
            Math.min(...publishedDates.map((date) => date.getTime())),
          ).toISOString()
        : countRow?._min.publishedAt?.toISOString() ?? null;
      const newestPublishedAt = publishedDates.length
        ? new Date(
            Math.max(...publishedDates.map((date) => date.getTime())),
          ).toISOString()
        : countRow?._max.publishedAt?.toISOString() ?? null;

      return [
        partnerId,
        {
          matchedContentCount,
          transcriptMatchedContentCount,
          creatorTextMatchedContentCount,
          creatorTextOnlyContentCount,
          weightedMatchedContentCount,
          weightedMatchedContentScore,
          recentContentCount,
          totalContentCount,
          topicFit,
          band,
          followers,
          medianViews,
          lastOnTopicAt,
          topPlatforms,
          platforms: Array.from(
            new Set(
              (recentRows.map(({ platformType }) => platformType).length
                ? recentRows.map(({ platformType }) => platformType)
                : partnerRows.map(({ platformType }) => platformType)
              ).filter(Boolean),
            ),
          ).sort(),
          sources: Array.from(
            new Set(
              partnerRows.map(({ chunkSource }) =>
                getEvidenceSource(chunkSource),
              ),
            ),
          ).sort(),
          oldestPublishedAt,
          newestPublishedAt,
          contentBars,
        },
      ] as const;
    }),
  );
  logTiming?.("match-summary-aggregation-complete", {
    summaryCount: summaries.size,
  });

  return summaries;
}

function toChunkResult(row: PartnerContentSearchRow, distance: number) {
  return {
    chunkId: row.chunkId,
    partnerContentItemId: row.partnerContentItemId,
    platform: {
      type: row.platformType,
      identifier: row.platformIdentifier,
    },
    content: {
      platformContentId: row.platformContentId,
      url: row.contentUrl,
      type: row.contentType,
      title: row.contentTitle,
      description: row.contentDescription ?? null,
      thumbnailUrl: row.contentThumbnailUrl,
      publishedAt: row.contentPublishedAt?.toISOString() ?? null,
      durationMs: row.contentDurationMs,
      viewCount:
        row.contentViewCount != null ? Number(row.contentViewCount) : null,
      likeCount:
        row.contentLikeCount != null ? Number(row.contentLikeCount) : null,
      commentCount:
        row.contentCommentCount != null
          ? Number(row.contentCommentCount)
          : null,
      shareCount:
        row.contentShareCount != null ? Number(row.contentShareCount) : null,
      saveCount:
        row.contentSaveCount != null ? Number(row.contentSaveCount) : null,
    },
    chunk: {
      source: row.chunkSource,
      text: row.chunkText,
      startMs: row.startMs,
      endMs: row.endMs,
    },
    distance,
    score: getRowRelevanceScore(row),
    cosineScore: toScore(distance),
    rerankScore: row.rerankScore ?? null,
    matchEvidence: createContentMatchEvidence({
      contentType: row.contentType,
      transcriptScore:
        getEvidenceSource(row.chunkSource) === "transcript"
          ? row.rerankScore ?? toScore(distance)
          : null,
      creatorTextScore:
        getEvidenceSource(row.chunkSource) === "creatorText"
          ? row.rerankScore ?? toScore(distance)
          : null,
    }),
  };
}
