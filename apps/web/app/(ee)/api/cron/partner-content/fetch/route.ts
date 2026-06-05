import { getYouTubeChannelVideos } from "@/lib/api/scrape-creators/get-youtube-channel-videos";
import { withCron } from "@/lib/cron/with-cron";
import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import { partnerContentFetchPayloadSchema } from "@/lib/partner-content-search/ingestion/enqueue";
import {
  NormalizedPartnerContentItem,
  normalizeYouTubeChannelVideo,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_YOUTUBE_CHANNEL_VIDEO_PAGES = 3;

// POST /api/cron/partner-content/fetch
export const POST = withCron(async ({ rawBody }) => {
  const payload = partnerContentFetchPayloadSchema.parse(JSON.parse(rawBody));

  const partnerPlatform = await prisma.partnerPlatform.findUnique({
    where: {
      id: payload.partnerPlatformId,
    },
    select: {
      id: true,
      partnerId: true,
      type: true,
      identifier: true,
      platformId: true,
      contentLastFetchedAt: true,
      latestContentUrl: true,
      verifiedAt: true,
    },
  });

  if (!partnerPlatform) {
    return logAndRespond(
      `[PartnerContentSearch] Partner platform ${payload.partnerPlatformId} not found for ${payload.mode} run ${payload.runStamp}.`,
      { status: 404, logLevel: "warn" },
    );
  }

  if (
    partnerPlatform.partnerId !== payload.partnerId ||
    partnerPlatform.type !== payload.platform
  ) {
    return logAndRespond(
      `[PartnerContentSearch] Partner platform ${payload.partnerPlatformId} did not match fetch payload for ${payload.mode} run ${payload.runStamp}.`,
      { status: 400, logLevel: "warn" },
    );
  }

  if (partnerPlatform.type !== "youtube") {
    return logAndRespond(
      `[PartnerContentSearch] Fetch and diff only supports YouTube right now. Received ${partnerPlatform.type} for ${payload.mode} run ${payload.runStamp}.`,
      { status: 501, logLevel: "warn" },
    );
  }

  const fetchedContentItems = await fetchRecentYouTubeContent({
    channelId: partnerPlatform.platformId ?? undefined,
    handle: partnerPlatform.platformId
      ? undefined
      : normalizeYouTubeHandle(partnerPlatform.identifier),
  });

  const platformContentIds = fetchedContentItems.map(
    ({ platformContentId }) => platformContentId,
  );

  const existingContentItems =
    platformContentIds.length === 0
      ? []
      : await prisma.partnerContentItem.findMany({
          where: {
            partnerPlatformId: partnerPlatform.id,
            platformContentId: {
              in: platformContentIds,
            },
          },
          select: {
            platformContentId: true,
          },
        });

  const existingContentIdSet = new Set(
    existingContentItems.map(({ platformContentId }) => platformContentId),
  );

  const newContentItems = fetchedContentItems.filter(
    ({ platformContentId }) => !existingContentIdSet.has(platformContentId),
  );

  const latestContentItem = fetchedContentItems[0];

  const writeResult = payload.dryRun
    ? {
        contentItemsCreated: 0,
        partnerPlatformUpdated: false,
      }
    : await writeFetchedContentItems({
        partnerId: payload.partnerId,
        partnerPlatformId: partnerPlatform.id,
        contentItems: newContentItems,
        latestContentUrl: latestContentItem?.url ?? null,
      });

  return NextResponse.json({
    success: true,
    mode: payload.mode,
    runStamp: payload.runStamp,
    dryRun: payload.dryRun,
    fetchedContentCount: fetchedContentItems.length,
    existingContentCount: existingContentItems.length,
    newContentCount: newContentItems.length,
    writesEnabled: !payload.dryRun,
    wouldWriteContentItems: newContentItems.length,
    ...writeResult,
    newContentItems: newContentItems.slice(0, 10),
    partnerPlatform,
  });
});

async function fetchRecentYouTubeContent({
  channelId,
  handle,
}: {
  channelId?: string;
  handle?: string;
}) {
  const maxItems = PARTNER_CONTENT_SEARCH_LIMITS.contentItemsPerPartnerPlatform;
  const recencyCutoff = getRecencyCutoff();
  const contentItems: NormalizedPartnerContentItem[] = [];
  let continuationToken: string | undefined;
  let page = 0;

  while (
    contentItems.length < maxItems &&
    page < MAX_YOUTUBE_CHANNEL_VIDEO_PAGES
  ) {
    const response = await getYouTubeChannelVideos({
      ...(channelId ? { channelId } : { handle: handle! }),
      continuationToken,
      includeExtras: false,
    });

    const normalizedVideos = response.videos
      .map(normalizeYouTubeChannelVideo)
      .filter((item): item is NormalizedPartnerContentItem => item !== null);

    const recentVideos = normalizedVideos.filter(
      ({ publishedAt }) => !publishedAt || publishedAt >= recencyCutoff,
    );

    contentItems.push(...recentVideos);

    const oldestPublishedAt = normalizedVideos
      .map(({ publishedAt }) => publishedAt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (
      !response.continuationToken ||
      (oldestPublishedAt && oldestPublishedAt < recencyCutoff)
    ) {
      break;
    }

    continuationToken = response.continuationToken ?? undefined;
    page++;
  }

  return contentItems.slice(0, maxItems);
}

function normalizeYouTubeHandle(handle: string) {
  return handle.replace(/^@/, "");
}

function getRecencyCutoff() {
  const cutoff = new Date();
  cutoff.setMonth(
    cutoff.getMonth() - PARTNER_CONTENT_SEARCH_LIMITS.recencyWindowMonths,
  );
  return cutoff;
}

async function writeFetchedContentItems({
  partnerId,
  partnerPlatformId,
  contentItems,
  latestContentUrl,
}: {
  partnerId: string;
  partnerPlatformId: string;
  contentItems: NormalizedPartnerContentItem[];
  latestContentUrl: string | null;
}) {
  const [createResult] = await prisma.$transaction([
    prisma.partnerContentItem.createMany({
      data: contentItems.map((item) => ({
        partnerId,
        partnerPlatformId,
        platformContentId: item.platformContentId,
        url: item.url,
        contentType: item.contentType,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnailUrl,
        publishedAt: item.publishedAt,
        durationMs: item.durationMs,
        viewCount:
          item.viewCount === null ? null : BigInt(Math.trunc(item.viewCount)),
        transcriptFetchStatus: "pending",
        hasTimestamps: false,
        totalChunkCount: 0,
        embeddedChunkCount: 0,
      })),
      skipDuplicates: true,
    }),
    prisma.partnerPlatform.update({
      where: {
        id: partnerPlatformId,
      },
      data: {
        contentLastFetchedAt: new Date(),
        ...(latestContentUrl && {
          latestContentUrl,
        }),
      },
    }),
  ]);

  return {
    contentItemsCreated: createResult.count,
    partnerPlatformUpdated: true,
  };
}
