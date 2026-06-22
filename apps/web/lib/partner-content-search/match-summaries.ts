import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
} from "./constants";
import {
  createContentMatchEvidence,
  deriveTopicFit,
  getEntityCreatorTextBoost,
  getEntityTranscriptScore,
  getEvidenceMatchScore,
  getEvidenceSource,
  getEvidenceTopicScore,
  getMatchedSourceScore,
  getPartnerContentSearchQuerySignals,
  getSourceScore,
  hasExactQueryMention,
  maxNullableScore,
  setSourceScore,
  type PartnerContentMatchEvidence,
  type PartnerContentMatchSource,
  type PartnerContentSearchQuerySignals,
  type SourceScoreByContentItemId,
} from "./ranking";
import { toScore, type PartnerContentSearchRow } from "./search-utils";
import type { PartnerContentSearchTimingLogger } from "./timing";

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

export async function getPartnerMatchSummaries({
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
