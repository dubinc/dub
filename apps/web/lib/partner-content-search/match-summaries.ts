import { PlatformType } from "@prisma/client";
import {
  ContentMatchContext,
  getBestMatchByContentItemId,
  getContentMatchStats,
  QueryContentMatchContext,
  toContentMatch,
} from "./content-matches";
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
  queryVector?: string | null;
  cutoffDistance?: number | null;
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

  const recentItemSourceBestDistance =
    queryVector && itemSourceBestDistance
      ? itemSourceBestDistance
      : new Map<string, Map<PartnerContentMatchSource, number>>();

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
      const contentMatches = recentRows.map((row) =>
        toContentMatch({
          row,
          context: contentMatchContext,
        }),
      );
      const {
        matchedContent,
        matchedContentCount,
        strongMatchedContentCount,
        partialMatchedContentCount,
        transcriptMatchedContentCount,
        creatorTextMatchedContentCount,
        creatorTextOnlyContentCount,
        weightedMatchedContentCount,
        weightedMatchedContentScore,
      } = getContentMatchStats(contentMatches);
      const recentContentCount = contentMatches.length;
      const { topicFit, band } = deriveTopicFit({
        matchedContentCount,
        weightedMatchedContentCount,
        weightedMatchedContentScore,
        recentContentCount,
      });
      const medianViews = median(
        matchedContent
          .map((match) => match.viewCount)
          .filter((views): views is number => views != null && views > 0),
        { round: true },
      );
      const matchedTimestamps = matchedContent
        .map((match) => match.publishedAt)
        .filter((publishedAt): publishedAt is string => Boolean(publishedAt))
        .map((publishedAt) => new Date(publishedAt).getTime());
      const lastOnTopicAt = matchedTimestamps.length
        ? new Date(Math.max(...matchedTimestamps)).toISOString()
        : null;
      const followers = followersByPartner.get(partnerId) ?? null;
      const platformFrequency = new Map<string, number>();
      for (const match of matchedContent.length
        ? matchedContent
        : contentMatches) {
        platformFrequency.set(
          match.platform,
          (platformFrequency.get(match.platform) ?? 0) + 1,
        );
      }
      const topPlatforms = Array.from(platformFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([platform]) => platform);
      const publishedDates = contentMatches
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
          strongMatchedContentCount,
          partialMatchedContentCount,
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
          contentMatches,
        },
      ] as const;
    }),
  );
  logTiming?.("match-summary-aggregation-complete", {
    summaryCount: summaries.size,
  });

  return summaries;
}
