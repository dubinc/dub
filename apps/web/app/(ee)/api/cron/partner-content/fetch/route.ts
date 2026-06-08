import { getYouTubeChannelVideos } from "@/lib/api/scrape-creators/get-youtube-channel-videos";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { PARTNER_CONTENT_SEARCH_LIMITS } from "@/lib/partner-content-search/constants";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  PARTNER_CONTENT_SEARCH_ROUTES,
  parsePartnerContentCronPayload,
  partnerContentFetchPayloadSchema,
  PartnerContentIngestionMode,
} from "@/lib/partner-content-search/ingestion/enqueue";
import {
  NormalizedPartnerContentItem,
  normalizeYouTubeChannelVideo,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_YOUTUBE_CHANNEL_VIDEO_PAGES = 3;

// POST /api/cron/partner-content/fetch
export const POST = withCron(async ({ rawBody }) => {
  const payload = parsePartnerContentCronPayload(
    partnerContentFetchPayloadSchema,
    rawBody,
  );
  if (payload instanceof Response) return payload;

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
  const contentItemsForTranscriptJobs = payload.forceTranscriptJobs
    ? fetchedContentItems
    : newContentItems;

  const { contentItemsCreated, transcriptJobCount } = payload.dryRun
    ? { contentItemsCreated: 0, transcriptJobCount: 0 }
    : await writeFetchedContentItems({
        mode: payload.mode,
        runStamp: payload.runStamp,
        dryRun: payload.dryRun,
        partnerId: payload.partnerId,
        partnerPlatformId: partnerPlatform.id,
        platform: payload.platform,
        contentItems: newContentItems,
        contentItemsForTranscriptJobs,
        latestContentUrl: latestContentItem?.url ?? null,
      });

  return logAndRespond(
    `[PartnerContentSearch] ${
      payload.dryRun ? "Dry-run fetched" : "Fetched"
    } ${fetchedContentItems.length} items (${newContentItems.length} new, ${
      existingContentItems.length
    } existing) for partner platform ${partnerPlatform.id}: created ${contentItemsCreated}, enqueued ${transcriptJobCount} transcript jobs on ${
      payload.mode
    } run ${payload.runStamp}.`,
  );
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
  mode,
  runStamp,
  dryRun,
  partnerId,
  partnerPlatformId,
  platform,
  contentItems,
  contentItemsForTranscriptJobs,
  latestContentUrl,
}: {
  mode: PartnerContentIngestionMode;
  runStamp: string;
  dryRun: boolean;
  partnerId: string;
  partnerPlatformId: string;
  platform: PartnerContentPlatform;
  contentItems: NormalizedPartnerContentItem[];
  contentItemsForTranscriptJobs: NormalizedPartnerContentItem[];
  latestContentUrl: string | null;
}) {
  const transcriptJobPlatformContentIds = contentItemsForTranscriptJobs.map(
    ({ platformContentId }) => platformContentId,
  );

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
        transcriptHasTimestamps: false,
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

  const transcriptContentItems =
    transcriptJobPlatformContentIds.length === 0
      ? []
      : await prisma.partnerContentItem.findMany({
          where: {
            partnerPlatformId,
            platformContentId: {
              in: transcriptJobPlatformContentIds,
            },
          },
          select: {
            id: true,
            partnerId: true,
            partnerPlatformId: true,
            platformContentId: true,
          },
        });

  const transcriptMessages = transcriptContentItems.map((contentItem) => ({
    url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.transcript),
    method: "POST" as const,
    deduplicationId: createPartnerContentDeduplicationId(
      "partner-content-transcript",
      mode,
      runStamp,
      contentItem.id,
    ),
    body: {
      mode,
      runStamp,
      dryRun,
      partnerId: contentItem.partnerId,
      partnerPlatformId: contentItem.partnerPlatformId,
      partnerContentItemId: contentItem.id,
      platform,
    },
  }));

  if (transcriptMessages.length > 0) {
    await qstash.batchJSON(transcriptMessages);
  }

  return {
    contentItemsCreated: createResult.count,
    transcriptJobCount: transcriptMessages.length,
  };
}
