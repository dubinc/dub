import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
} from "./constants";
import type { PartnerContentSearchTimingLogger } from "./timing";

// Slim content row for aggregates only; display fields come from loaded chunks.
export type PartnerRecentContentRow = {
  partnerId: string;
  partnerContentItemId: string;
  platformType: string;
  contentType: string;
  publishedAt: Date | null;
  viewCount: bigint | number | null;
  rowNumber: bigint | number;
};

export async function fetchMatchSummaryBaseData({
  partnerIds,
  platforms,
  logTiming,
}: {
  partnerIds: string[];
  platforms?: PlatformType[];
  logTiming?: PartnerContentSearchTimingLogger;
}) {
  const platformFilter = platforms?.length
    ? Prisma.sql`AND pp.type IN (${Prisma.join(platforms)})`
    : Prisma.empty;

  // "Recent" is a time window (recencyWindowMonths), not a post count — a count
  // window spans wildly different time per creator, conflating active and dormant.
  const recencyCutoff = new Date();
  recencyCutoff.setMonth(
    recencyCutoff.getMonth() -
      PARTNER_CONTENT_SEARCH_LIMITS.recencyWindowMonths,
  );

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
    .$queryRaw<PartnerRecentContentRow[]>(
      Prisma.sql`
        SELECT
          partnerId,
          partnerContentItemId,
          platformType,
          contentType,
          publishedAt,
          viewCount,
          rowNumber
        FROM (
          SELECT
            pci.partnerId,
            pci.id AS partnerContentItemId,
            pp.type AS platformType,
            pci.contentType,
            pci.publishedAt,
            pci.viewCount,
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

  return { contentCounts, recentContentRows, followerRows };
}
