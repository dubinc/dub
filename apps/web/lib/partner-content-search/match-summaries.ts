import { PlatformType } from "@prisma/client";
import {
  ContentMatchContext,
  getBestMatchByContentItemId,
  getContentBarMatchStats,
  QueryContentMatchContext,
  toContentMatchBar,
} from "./content-match-bars";
import { fetchMatchSummaryBaseData } from "./match-summary-queries";
import {
  deriveTopicFit,
  getEvidenceSource,
  setSourceScore,
  type PartnerContentMatchSource,
  type SourceScoreByContentItemId,
} from "./ranking";
import { median, type PartnerContentSearchRow } from "./search-utils";
import type { PartnerContentSearchTimingLogger } from "./timing";

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

export async function getPartnerMatchSummaries({
  rows,
  partnerIds,
  platforms,
  queryVector,
  cutoffDistance,
  itemSourceBestDistance,
  logTiming,
}: {
  rows: PartnerContentSearchRow[];
  partnerIds: string[];
  platforms?: PlatformType[];
  // Query mode only: gates a partner's recent posts as matched when at least as
  // relevant as the weakest candidate (cutoffDistance). Null in list mode.
  queryVector?: string | null;
  cutoffDistance?: number | null;
  // Best distance per item+source from retrieval, reused to gate matched recent
  // content without a second per-item DISTANCE pass.
  itemSourceBestDistance?: SourceScoreByContentItemId;
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  if (partnerIds.length === 0) return new Map<string, null>();

  const { contentCounts, recentContentRows, followerRows } =
    await fetchMatchSummaryBaseData({
      partnerIds,
      platforms,
      logTiming,
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

  // Query mode: reuse itemSourceBestDistance to gate matched recent posts (a post
  // absent from it is provably beyond the cutoff — see retrieval's producer).
  const recentItemSourceBestDistance =
    queryVector && itemSourceBestDistance
      ? itemSourceBestDistance
      : new Map<string, Map<PartnerContentMatchSource, number>>();

  // Per-item+source reranker scores from the candidate pool, to gate on-topic posts.
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
      // Brand-facing signals over on-topic posts: median views + last on-topic date.
      const medianViews = median(
        matchedBars
          .map((bar) => bar.viewCount)
          .filter((views): views is number => views != null && views > 0),
        { round: true },
      );
      const matchedTimestamps = matchedBars
        .map((bar) => bar.publishedAt)
        .filter((publishedAt): publishedAt is string => Boolean(publishedAt))
        .map((publishedAt) => new Date(publishedAt).getTime());
      const lastOnTopicAt = matchedTimestamps.length
        ? new Date(Math.max(...matchedTimestamps)).toISOString()
        : null;
      const followers = followersByPartner.get(partnerId) ?? null;
      // Top platforms by matched-post frequency (falls back to all recent when none matched).
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
