import { DubApiError } from "@/lib/api/errors";
import { calculatePartnerRanking } from "@/lib/api/network/calculate-partner-ranking";
import { parseRankedNetworkPartners } from "@/lib/api/network/normalize-ranked-network-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
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
import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_PARTNER_LIMIT = 20;

const partnerNetworkContentSearchSchema = z.object({
  query: z.string().trim().max(500).optional(),
  platform: z.enum(PlatformType).optional(),
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

    const { rows, reranked, queryVector, cutoffDistance } = body.query
      ? await searchPartnerNetworkContent({
          programId,
          query: body.query,
          platform: body.platform,
          country: body.country,
          partnerIds: body.partnerIds,
          starred: body.starred,
          limit: candidateChunkCount,
          rerank: body.rerank,
        })
      : {
          rows: await listPartnerNetworkContent({
            programId,
            platform: body.platform,
            country: body.country,
            partnerIds: body.partnerIds,
            starred: body.starred,
            limit: candidateChunkCount,
          }),
          reranked: false,
          queryVector: null,
          cutoffDistance: null,
        };
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
    const matchSummaries = await getPartnerMatchSummaries({
      rows,
      partnerIds: partnerCandidates.map(({ partnerId }) => partnerId),
      platform: body.platform,
      query: body.query,
      queryVector,
      cutoffDistance,
    });
    const networkPartners = await getNetworkPartnersById({
      programId,
      partnerIds: partnerCandidates.map(({ partnerId }) => partnerId),
      platform: body.platform,
      country: body.country,
      starred: body.starred,
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

    return NextResponse.json({
      success: true,
      query: body.query ?? null,
      platform: body.platform ?? null,
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

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function getSourceExactMention(
  sourceMentionsByItemId: Map<string, Map<PartnerContentMatchSource, boolean>>,
  itemId: string,
  source: PartnerContentMatchSource,
) {
  return sourceMentionsByItemId.get(itemId)?.get(source) ?? false;
}

function setSourceExactMention(
  sourceMentionsByItemId: Map<string, Map<PartnerContentMatchSource, boolean>>,
  itemId: string,
  source: PartnerContentMatchSource,
) {
  const sourceMentions = sourceMentionsByItemId.get(itemId) ?? new Map();
  sourceMentions.set(source, true);
  sourceMentionsByItemId.set(itemId, sourceMentions);
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
  platform,
  country,
  starred,
}: {
  programId: string;
  partnerIds: string[];
  platform?: PlatformType;
  country?: string;
  starred?: boolean;
}) {
  if (partnerIds.length === 0) return new Map();

  const rankedPartners = await calculatePartnerRanking({
    programId,
    partnerIds,
    status: "discover",
    sortBy: "relevance",
    page: 1,
    pageSize: partnerIds.length,
    country,
    starred: starred ?? undefined,
    platform,
  });
  const partners = parseRankedNetworkPartners(rankedPartners);

  return new Map(partners.map((partner) => [partner.id, partner]));
}

async function searchPartnerNetworkContent({
  programId,
  query,
  platform,
  country,
  partnerIds,
  starred,
  limit,
  rerank,
}: {
  programId: string;
  query: string;
  platform?: PlatformType;
  country?: string;
  partnerIds?: string[];
  starred?: boolean;
  limit: number;
  rerank: boolean;
}) {
  let queryEmbedding: number[];
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
  const queryVector = serializeEmbeddingForVector(queryEmbedding);
  const starredFilter =
    starred === true
      ? Prisma.sql`AND dp.starredAt IS NOT NULL`
      : starred === false
        ? Prisma.sql`AND (dp.starredAt IS NULL OR dp.id IS NULL)`
        : Prisma.empty;
  const platformFilter = platform
    ? Prisma.sql`AND pp.type = ${platform}`
    : Prisma.empty;
  const countryFilter = country
    ? Prisma.sql`AND p.country = ${country}`
    : Prisma.empty;
  const partnerIdsFilter = partnerIds?.length
    ? Prisma.sql`AND c.partnerId IN (${Prisma.join(partnerIds)})`
    : Prisma.empty;

  // Retrieval stays on the index-friendly flat ANN shape (`ORDER BY DISTANCE ...
  // LIMIT`). A SQL window-function dedup here would force a full distance scan and
  // defeat the vector index, so instead we over-fetch a chunk pool and collapse it
  // to the best chunk per content item in app code (below). That keeps chunk-heavy
  // videos from crowding the candidate set while preserving the ANN fast path.
  // Per-video "match" coverage for the bars is computed exactly and separately in
  // getPartnerMatchSummaries.
  const poolSize = Math.max(
    limit,
    PARTNER_CONTENT_SEARCH_LIMITS.vectorSearchChunkPoolSize,
  );
  const poolRows = await prisma.$queryRaw<PartnerContentSearchRow[]>(Prisma.sql`
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
      pci.description AS contentDescription,
      pci.thumbnailUrl AS contentThumbnailUrl,
      pci.publishedAt AS contentPublishedAt,
      pci.durationMs AS contentDurationMs,
      c.source AS chunkSource,
      c.chunkText,
      c.startMs,
      c.endMs,
      DISTANCE(TO_VECTOR(${queryVector}), c.embedding, 'cosine') AS distance
    FROM PartnerContentChunk c
    INNER JOIN PartnerContentItem pci ON pci.id = c.partnerContentItemId
    INNER JOIN Partner p ON p.id = c.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    LEFT JOIN ProgramEnrollment enrolled
      ON enrolled.partnerId = p.id
      AND enrolled.programId = ${programId}
    LEFT JOIN DiscoveredPartner dp
      ON dp.partnerId = p.id
      AND dp.programId = ${programId}
    WHERE c.embedding IS NOT NULL
      AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
      ${platformFilter}
      ${countryFilter}
      ${partnerIdsFilter}
      AND p.networkStatus IN ("approved", "trusted")
      AND enrolled.id IS NULL
      AND (dp.ignoredAt IS NULL OR dp.id IS NULL)
      ${starredFilter}
    ORDER BY distance ASC
    LIMIT ${poolSize}
  `);

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

  if (!rerank) {
    return {
      rows: sortRowsByRelevanceScore(rows),
      reranked: false,
      queryVector,
      cutoffDistance,
    };
  }

  const rerankResult = await rerankPartnerSearchRows({ query, rows });
  return {
    ...rerankResult,
    rows: sortRowsByRelevanceScore(rerankResult.rows),
    queryVector,
    cutoffDistance,
  };
}

async function listPartnerNetworkContent({
  programId,
  platform,
  country,
  partnerIds,
  starred,
  limit,
}: {
  programId: string;
  platform?: PlatformType;
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
      ...(platform && {
        partnerPlatform: {
          type: platform,
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
  rowNumber: bigint | number;
};

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

async function getPartnerMatchSummaries({
  rows,
  partnerIds,
  platform,
  query,
  queryVector,
  cutoffDistance,
}: {
  rows: PartnerContentSearchRow[];
  partnerIds: string[];
  platform?: PlatformType;
  query?: string | null;
  // Present only in query mode. When set, each shown partner's recent videos are
  // scored exactly against the query (bounded by their ids) and counted as matched
  // when at least as relevant as the weakest candidate (cutoffDistance). When null
  // (list mode) we fall back to the retrieval rows for the match determination.
  queryVector?: string | null;
  cutoffDistance?: number | null;
}) {
  if (partnerIds.length === 0) return new Map<string, null>();

  const querySignals = getPartnerContentSearchQuerySignals(query);
  const exactMentionPattern =
    querySignals.intent === "entity" && querySignals.normalizedQuery
      ? `%${querySignals.normalizedQuery}%`
      : null;
  const platformFilter = platform
    ? Prisma.sql`AND pp.type = ${platform}`
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

  // These three reads are independent — only the per-item vector scoring further
  // down needs the recent-content ids — so issue them as one parallel wave rather
  // than three serial round trips. (Prisma promises are lazy and don't execute
  // until awaited, so they fan out together under the Promise.all below.)
  const contentCountsPromise = prisma.partnerContentItem.groupBy({
    by: ["partnerId"],
    where: {
      partnerId: {
        in: partnerIds,
      },
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
      embeddedChunkCount: {
        gt: 0,
      },
      ...(platform && {
        partnerPlatform: {
          type: platform,
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
  });

  const recentContentRowsPromise = prisma.$queryRaw<
    PartnerRecentContentBarRow[]
  >(
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
          ROW_NUMBER() OVER (
            PARTITION BY pci.partnerId
            ORDER BY COALESCE(pci.publishedAt, pci.createdAt) DESC, pci.id ASC
          ) AS rowNumber
        FROM PartnerContentItem pci
        INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
        WHERE pci.partnerId IN (${Prisma.join(partnerIds)})
          ${platformFilter}
          AND COALESCE(pci.publishedAt, pci.createdAt) >= ${recencyCutoff}
          AND EXISTS (
            SELECT 1
            FROM PartnerContentChunk c
            WHERE c.partnerContentItemId = pci.id
              AND c.embedding IS NOT NULL
              AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
          )
      ) recentContent
      WHERE rowNumber <= ${PARTNER_CONTENT_SEARCH_LIMITS.recentContentMaxPerPartner}
      ORDER BY partnerId ASC, rowNumber ASC
    `,
  );

  // Reach: total followers across the partner's platforms (or just the filtered
  // platform). The single signal brands most want and the card wasn't showing.
  const followerRowsPromise = prisma.partnerPlatform.groupBy({
    by: ["partnerId"],
    where: {
      partnerId: {
        in: partnerIds,
      },
      ...(platform && {
        type: platform,
      }),
    },
    _sum: {
      subscribers: true,
    },
  });

  const [contentCounts, recentContentRows, followerRows] = await Promise.all([
    contentCountsPromise,
    recentContentRowsPromise,
    followerRowsPromise,
  ]);
  const followersByPartner = new Map(
    followerRows.map((row) => [
      row.partnerId,
      row._sum.subscribers != null ? Number(row._sum.subscribers) : 0,
    ]),
  );

  const countByPartnerId = new Map(
    contentCounts.map((row) => [row.partnerId, row]),
  );
  const rowsByPartnerId = new Map<string, PartnerContentSearchRow[]>();
  const recentRowsByPartnerId = new Map<string, PartnerRecentContentBarRow[]>();

  for (const row of rows) {
    const partnerRows = rowsByPartnerId.get(row.partnerId) ?? [];
    partnerRows.push(row);
    rowsByPartnerId.set(row.partnerId, partnerRows);
  }

  for (const row of recentContentRows) {
    const partnerRows = recentRowsByPartnerId.get(row.partnerId) ?? [];
    partnerRows.push(row);
    recentRowsByPartnerId.set(row.partnerId, partnerRows);
  }

  // Query mode only: score every shown partner's recent videos exactly against the
  // query, bounded by their content-item ids (a small, PK-filtered set, not the
  // whole corpus). This makes "matched" coverage independent of which raw chunk
  // happened to survive the global candidate cap.
  const recentItemSourceBestDistance = new Map<
    string,
    Map<PartnerContentMatchSource, number>
  >();
  const recentItemSourceExactMentions = new Map<
    string,
    Map<PartnerContentMatchSource, boolean>
  >();
  if (queryVector) {
    const recentItemIds = recentContentRows.map(
      ({ partnerContentItemId }) => partnerContentItemId,
    );
    if (recentItemIds.length > 0) {
      const itemScores = await prisma.$queryRaw<
        {
          partnerContentItemId: string;
          source: string;
          bestDistance: number | string;
        }[]
      >(Prisma.sql`
        SELECT
          c.partnerContentItemId,
          c.source,
          MIN(
            DISTANCE(TO_VECTOR(${queryVector}), c.embedding, 'cosine')
          ) AS bestDistance
        FROM PartnerContentChunk c
        WHERE c.partnerContentItemId IN (${Prisma.join(recentItemIds)})
          AND c.embedding IS NOT NULL
          AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
        GROUP BY c.partnerContentItemId, c.source
      `);
      for (const row of itemScores) {
        setSourceDistance(
          recentItemSourceBestDistance,
          row.partnerContentItemId,
          getEvidenceSource(row.source),
          Number(row.bestDistance),
        );
      }

      if (exactMentionPattern) {
        const exactMentionRows = await prisma.$queryRaw<
          {
            partnerContentItemId: string;
            source: string;
            exactMentionCount: bigint | number;
          }[]
        >(Prisma.sql`
          SELECT
            c.partnerContentItemId,
            c.source,
            COUNT(*) AS exactMentionCount
          FROM PartnerContentChunk c
          WHERE c.partnerContentItemId IN (${Prisma.join(recentItemIds)})
            AND c.embedding IS NOT NULL
            AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
            AND LOWER(c.chunkText) LIKE ${exactMentionPattern}
          GROUP BY c.partnerContentItemId, c.source
        `);

        for (const row of exactMentionRows) {
          if (Number(row.exactMentionCount) === 0) continue;
          setSourceExactMention(
            recentItemSourceExactMentions,
            row.partnerContentItemId,
            getEvidenceSource(row.source),
          );
        }
      }
    }
  }

  // Calibrated reranker score per item + source (from the candidate pool), used
  // to gate which recent posts count as on-topic.
  const rerankByItemSource = new Map<
    string,
    Map<PartnerContentMatchSource, number>
  >();
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

  return new Map(
    partnerIds.map((partnerId) => {
      const partnerRows = rowsByPartnerId.get(partnerId) ?? [];
      const recentRows = recentRowsByPartnerId.get(partnerId) ?? [];
      const countRow = countByPartnerId.get(partnerId);
      const totalContentCount = countRow ? countRow._count._all : 0;
      const bestMatchByContentItemId = new Map<
        string,
        {
          contentType: string;
          transcriptScore: number | null;
          creatorTextScore: number | null;
        }
      >();

      for (const row of partnerRows) {
        // Use the effective score (rerank when present) so the content-match
        // bars stay consistent with the reranked partner ordering.
        const score = row.rerankScore ?? toScore(Number(row.distance));
        const evidenceSource = getEvidenceSource(row.chunkSource);
        const existing = bestMatchByContentItemId.get(row.partnerContentItemId);
        const next = existing ?? {
          contentType: row.contentType,
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

      const contentBars = recentRows.map((row) => {
        let matchEvidence: PartnerContentMatchEvidence;
        let matchScore: number | null;

        if (queryVector) {
          // On-topic gate: prefer the reranker's calibrated relevance, which
          // cleanly separates on- from off-topic. Fall back to the cosine cutoff
          // only for items the reranker didn't score (rerank disabled/failed, or
          // the item never reached the candidate pool).
          const transcriptScore = getEntityTranscriptScore({
            currentScore: getMatchedSourceScore({
              rerankScore: getSourceScore(
                rerankByItemSource,
                row.partnerContentItemId,
                "transcript",
              ),
              bestDistance: getSourceScore(
                recentItemSourceBestDistance,
                row.partnerContentItemId,
                "transcript",
              ),
              cutoffDistance,
            }),
            hasExactQueryMention: getSourceExactMention(
              recentItemSourceExactMentions,
              row.partnerContentItemId,
              "transcript",
            ),
            queryIntent: querySignals.intent,
          });
          const vectorCreatorTextScore = getMatchedSourceScore({
            rerankScore: getSourceScore(
              rerankByItemSource,
              row.partnerContentItemId,
              "creatorText",
            ),
            bestDistance: getSourceScore(
              recentItemSourceBestDistance,
              row.partnerContentItemId,
              "creatorText",
            ),
            cutoffDistance,
          });
          const titleHasExactQueryMention = hasExactQueryMention(
            row.contentTitle,
            querySignals,
          );
          const descriptionHasExactQueryMention = hasExactQueryMention(
            row.contentDescription,
            querySignals,
          );
          const creatorTextBoost = getEntityCreatorTextBoost({
            platformType: row.platformType,
            contentType: row.contentType,
            transcriptFetchStatus: row.transcriptFetchStatus,
            titleHasExactQueryMention,
            descriptionHasExactQueryMention,
            chunkHasExactQueryMention: getSourceExactMention(
              recentItemSourceExactMentions,
              row.partnerContentItemId,
              "creatorText",
            ),
            transcriptScore,
            queryIntent: querySignals.intent,
          });
          const creatorTextScore = maxNullableScore(
            vectorCreatorTextScore,
            creatorTextBoost?.score,
          );

          matchEvidence = createContentMatchEvidence({
            contentType: row.contentType,
            transcriptScore,
            creatorTextScore,
            creatorTextWeightOverride: creatorTextBoost?.weight,
          });
          matchScore = getEvidenceMatchScore(matchEvidence);
        } else {
          const match = bestMatchByContentItemId.get(row.partnerContentItemId);
          matchEvidence = createContentMatchEvidence({
            contentType: row.contentType,
            transcriptScore: match?.transcriptScore ?? null,
            creatorTextScore: match?.creatorTextScore ?? null,
          });
          matchScore = getEvidenceMatchScore(matchEvidence);
        }
        const matched = matchEvidence.sources.length > 0;

        return {
          partnerContentItemId: row.partnerContentItemId,
          platform: row.platformType,
          platformContentId: row.platformContentId,
          title: row.contentTitle,
          url: row.contentUrl,
          durationMs:
            row.contentDurationMs != null
              ? Number(row.contentDurationMs)
              : null,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          viewCount: row.viewCount != null ? Number(row.viewCount) : null,
          matched,
          matchScore,
          matchEvidence,
        };
      });
      const matchedContentCount = contentBars.filter(
        ({ matched }) => matched,
      ).length;
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
            (total, bar) =>
              total + (getEvidenceTopicScore(bar.matchEvidence) ?? 0),
            0,
          )
          .toFixed(3),
      );
      const recentContentCount = contentBars.length;
      const matchedBars = contentBars.filter((bar) => bar.matched);
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
