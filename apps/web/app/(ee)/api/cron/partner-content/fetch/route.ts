import { createId } from "@/lib/api/create-id";
import { getInstagramUserPosts } from "@/lib/api/scrape-creators/get-instagram-user-posts";
import { getTikTokProfileVideos } from "@/lib/api/scrape-creators/get-tiktok-profile-videos";
import { getYouTubeChannelVideos } from "@/lib/api/scrape-creators/get-youtube-channel-videos";
import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { hashText } from "@/lib/partner-content-search/chunk-transcript";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
} from "@/lib/partner-content-search/constants";
import { refreshPartnerContentItemChunkCountsBulk } from "@/lib/partner-content-search/ingestion/chunk-counts";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  parsePartnerContentCronPayload,
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  partnerContentFetchPayloadSchema,
  PartnerContentIngestionMode,
} from "@/lib/partner-content-search/ingestion/enqueue";
import {
  NormalizedPartnerContentItem,
  normalizeInstagramUserPost,
  normalizeTikTokProfileVideo,
  normalizeYouTubeChannelVideo,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CONTENT_PAGES = 3;

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

  const fetchedContentItems = await fetchRecentPlatformContent({
    platform: payload.platform,
    platformId: partnerPlatform.platformId ?? undefined,
    identifier: partnerPlatform.identifier,
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
    ? fetchedContentItems.filter(isTranscriptEligibleContentItem)
    : newContentItems.filter(isTranscriptEligibleContentItem);

  const { contentItemsCreated, transcriptJobCount, embedJobCount } =
    payload.dryRun
      ? { contentItemsCreated: 0, transcriptJobCount: 0, embedJobCount: 0 }
      : await writeFetchedContentItems({
          mode: payload.mode,
          runStamp: payload.runStamp,
          dryRun: payload.dryRun,
          partnerId: payload.partnerId,
          partnerPlatformId: partnerPlatform.id,
          platform: payload.platform,
          contentItems: newContentItems,
          metadataSourceItems: fetchedContentItems,
          contentItemsForTranscriptJobs,
          latestContentUrl: latestContentItem?.url ?? null,
        });

  return logAndRespond(
    `[PartnerContentSearch] ${
      payload.dryRun ? "Dry-run fetched" : "Fetched"
    } ${fetchedContentItems.length} items (${newContentItems.length} new, ${
      existingContentItems.length
    } existing) for partner platform ${partnerPlatform.id}: created ${contentItemsCreated}, enqueued ${transcriptJobCount} transcript jobs and ${embedJobCount} metadata embed jobs on ${
      payload.mode
    } run ${payload.runStamp}.`,
  );
});

async function fetchRecentPlatformContent({
  platform,
  platformId,
  identifier,
}: {
  platform: PartnerContentPlatform;
  platformId?: string;
  identifier: string;
}) {
  switch (platform) {
    case "youtube":
      return fetchRecentYouTubeContent({
        channelId: platformId,
        handle: platformId ? undefined : normalizeSocialHandle(identifier),
      });
    case "tiktok":
      return fetchRecentTikTokContent({
        handle: normalizeSocialHandle(identifier),
        userId: platformId,
      });
    case "instagram":
      return fetchRecentInstagramContent({
        handle: normalizeSocialHandle(identifier),
      });
  }
}

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

  while (contentItems.length < maxItems && page < MAX_CONTENT_PAGES) {
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

async function fetchRecentTikTokContent({
  handle,
  userId,
}: {
  handle: string;
  userId?: string;
}) {
  const maxItems = PARTNER_CONTENT_SEARCH_LIMITS.contentItemsPerPartnerPlatform;
  const recencyCutoff = getRecencyCutoff();
  const contentItems: NormalizedPartnerContentItem[] = [];
  let maxCursor: string | undefined;
  let page = 0;

  while (contentItems.length < maxItems && page < MAX_CONTENT_PAGES) {
    const response = await getTikTokProfileVideos({
      handle,
      userId,
      maxCursor,
    });

    const normalizedVideos = response.aweme_list
      .map((video) => normalizeTikTokProfileVideo(video, handle))
      .filter((item): item is NormalizedPartnerContentItem => item !== null);

    const recentVideos = normalizedVideos.filter(
      ({ publishedAt }) => !publishedAt || publishedAt >= recencyCutoff,
    );

    contentItems.push(...recentVideos);

    const oldestPublishedAt = getOldestPublishedAt(normalizedVideos);

    if (
      !response.max_cursor ||
      response.has_more === false ||
      (oldestPublishedAt && oldestPublishedAt < recencyCutoff)
    ) {
      break;
    }

    maxCursor = response.max_cursor ?? undefined;
    page++;
  }

  return contentItems.slice(0, maxItems);
}

async function fetchRecentInstagramContent({ handle }: { handle: string }) {
  const maxItems = PARTNER_CONTENT_SEARCH_LIMITS.contentItemsPerPartnerPlatform;
  const recencyCutoff = getRecencyCutoff();
  const contentItems: NormalizedPartnerContentItem[] = [];
  let nextMaxId: string | undefined;
  let page = 0;

  while (contentItems.length < maxItems && page < MAX_CONTENT_PAGES) {
    const response = await getInstagramUserPosts({
      handle,
      nextMaxId,
    });

    const normalizedPosts = response.items
      .map(normalizeInstagramUserPost)
      .filter((item): item is NormalizedPartnerContentItem => item !== null);

    const recentPosts = normalizedPosts.filter(
      ({ publishedAt }) => !publishedAt || publishedAt >= recencyCutoff,
    );

    contentItems.push(...recentPosts);

    const oldestPublishedAt = getOldestPublishedAt(normalizedPosts);

    if (
      !response.next_max_id ||
      response.more_available === false ||
      (oldestPublishedAt && oldestPublishedAt < recencyCutoff)
    ) {
      break;
    }

    nextMaxId = response.next_max_id ?? undefined;
    page++;
  }

  return contentItems.slice(0, maxItems);
}

// Shared by all three platforms — strips a leading "@" from a handle.
function normalizeSocialHandle(handle: string) {
  return handle.replace(/^@/, "");
}

function isTranscriptEligibleContentItem(item: NormalizedPartnerContentItem) {
  return item.transcriptEligible !== false;
}

function getOldestPublishedAt(contentItems: NormalizedPartnerContentItem[]) {
  return contentItems
    .map(({ publishedAt }) => publishedAt)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
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
  metadataSourceItems,
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
  metadataSourceItems: NormalizedPartnerContentItem[];
  contentItemsForTranscriptJobs: NormalizedPartnerContentItem[];
  latestContentUrl: string | null;
}) {
  const dedupedMetadataSourceItems = dedupeContentItems(metadataSourceItems);
  const metadataPlatformContentIds = dedupedMetadataSourceItems.map(
    ({ platformContentId }) => platformContentId,
  );
  const transcriptJobPlatformContentIds = contentItemsForTranscriptJobs.map(
    ({ platformContentId }) => platformContentId,
  );

  const [createResult] = await prisma.$transaction([
    prisma.partnerContentItem.createMany({
      data: contentItems.map((item) => ({
        id: createId({ prefix: "pci_" }),
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

  const metadataContentItems =
    metadataPlatformContentIds.length === 0
      ? []
      : await prisma.partnerContentItem.findMany({
          where: {
            partnerPlatformId,
            platformContentId: {
              in: metadataPlatformContentIds,
            },
          },
          select: {
            id: true,
            partnerId: true,
            platformContentId: true,
            chunks: {
              where: {
                source: "metadata",
              },
              select: {
                textHash: true,
              },
              take: 1,
            },
          },
        });

  const metadataChunkCount = await writeMetadataChunks({
    contentItems: metadataContentItems,
    sourceItems: dedupedMetadataSourceItems,
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

  await dispatchContentJobs({
    messages: transcriptMessages,
    kind: "transcript",
    mode,
    runStamp,
    partnerPlatformId,
  });

  const metadataEmbedMessages = metadataContentItems
    .filter(({ platformContentId }) =>
      metadataChunkCount.createdPlatformContentIds.has(platformContentId),
    )
    .map((contentItem) => ({
      url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.embed),
      method: "POST" as const,
      flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
      deduplicationId: createPartnerContentDeduplicationId(
        "partner-content-embed-metadata",
        mode,
        runStamp,
        contentItem.id,
      ),
      body: {
        mode,
        runStamp,
        dryRun,
        partnerId: contentItem.partnerId,
        partnerContentItemId: contentItem.id,
      },
    }));

  await dispatchContentJobs({
    messages: metadataEmbedMessages,
    kind: "metadata-embed",
    mode,
    runStamp,
    partnerPlatformId,
  });

  return {
    contentItemsCreated: createResult.count,
    transcriptJobCount: transcriptMessages.length,
    embedJobCount: metadataEmbedMessages.length,
  };
}

// Post-commit QStash dispatch. The content items are already written, so a
// dropped batch would silently strand transcript/embed jobs. Log structured
// context before rethrowing so the failure is observable + alertable (the
// rethrow surfaces it as withCron's 500); deduplicationIds keep the retry safe.
async function dispatchContentJobs<
  T extends Parameters<typeof qstash.batchJSON>[0],
>({
  messages,
  kind,
  mode,
  runStamp,
  partnerPlatformId,
}: {
  messages: T;
  kind: "transcript" | "metadata-embed";
  mode: PartnerContentIngestionMode;
  runStamp: string;
  partnerPlatformId: string;
}) {
  if (messages.length === 0) return;

  try {
    await qstash.batchJSON(messages);
  } catch (error) {
    logger.error("partner-content.batchJSON.failed", {
      error,
      kind,
      mode,
      runStamp,
      partnerPlatformId,
      messageCount: messages.length,
    });

    throw error;
  }
}

function dedupeContentItems(contentItems: NormalizedPartnerContentItem[]) {
  return Array.from(
    new Map(
      contentItems.map((item) => [item.platformContentId, item]),
    ).values(),
  );
}

async function writeMetadataChunks({
  contentItems,
  sourceItems,
}: {
  contentItems: Array<{
    id: string;
    partnerId: string;
    platformContentId: string;
    chunks: Array<{
      textHash: string;
    }>;
  }>;
  sourceItems: NormalizedPartnerContentItem[];
}) {
  const sourceItemByPlatformContentId = new Map(
    sourceItems.map((item) => [item.platformContentId, item]),
  );
  const createdPlatformContentIds = new Set<string>();
  const embeddingModel = PARTNER_CONTENT_SEARCH_MODELS.embedding.id;

  // Collect the items whose metadata actually changed, plus the new chunks to
  // create, so we can write everything in one batched transaction instead of a
  // per-item transaction + count refresh (which fanned out to ~100-250 serial
  // DB round-trips on a full backfill).
  const changedItems: {
    id: string;
    sourceItem: NormalizedPartnerContentItem;
  }[] = [];
  const chunksToCreate: Prisma.PartnerContentChunkCreateManyInput[] = [];

  for (const contentItem of contentItems) {
    const sourceItem = sourceItemByPlatformContentId.get(
      contentItem.platformContentId,
    );
    if (!sourceItem) continue;

    const chunkText = createMetadataChunkText(sourceItem);
    const textHash = chunkText ? hashText(chunkText) : null;
    const existingTextHash = contentItem.chunks[0]?.textHash ?? null;

    if (textHash === existingTextHash) continue;

    changedItems.push({ id: contentItem.id, sourceItem });

    if (chunkText) {
      chunksToCreate.push({
        id: createId({ prefix: "pcc_" }),
        partnerContentItemId: contentItem.id,
        partnerId: contentItem.partnerId,
        source: "metadata",
        chunkIndex: 0,
        chunkText,
        startMs: null,
        endMs: null,
        textHash: textHash!,
        embeddingModel,
      });
      createdPlatformContentIds.add(contentItem.platformContentId);
    }
  }

  if (changedItems.length === 0) {
    return { createdPlatformContentIds };
  }

  const changedItemIds = changedItems.map(({ id }) => id);

  await prisma.$transaction([
    ...changedItems.map(({ id, sourceItem }) =>
      prisma.partnerContentItem.update({
        where: {
          id,
        },
        data: {
          title: sourceItem.title,
          description: sourceItem.description,
          thumbnailUrl: sourceItem.thumbnailUrl,
          publishedAt: sourceItem.publishedAt,
          durationMs: sourceItem.durationMs,
          viewCount:
            sourceItem.viewCount === null
              ? null
              : BigInt(Math.trunc(sourceItem.viewCount)),
        },
      }),
    ),
    prisma.partnerContentChunk.deleteMany({
      where: {
        partnerContentItemId: {
          in: changedItemIds,
        },
        source: "metadata",
      },
    }),
    ...(chunksToCreate.length > 0
      ? [prisma.partnerContentChunk.createMany({ data: chunksToCreate })]
      : []),
  ]);

  await refreshPartnerContentItemChunkCountsBulk(changedItemIds);

  return { createdPlatformContentIds };
}

function createMetadataChunkText(item: NormalizedPartnerContentItem) {
  const lines = [
    item.contentType ? `Content type: ${item.contentType}` : null,
    item.title ? `Title: ${item.title}` : null,
    item.description ? `Description: ${item.description}` : null,
  ].filter((line): line is string => Boolean(line?.trim()));

  if (lines.length <= 1 && !item.title && !item.description) return null;

  return lines.join("\n");
}
