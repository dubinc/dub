import "server-only";

import { createId } from "@/lib/api/create-id";
import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { hashText } from "@/lib/partner-content-search/chunk-transcript";
import { PARTNER_CONTENT_SEARCH_MODELS } from "@/lib/partner-content-search/constants";
import { refreshPartnerContentItemChunkCountsBulk } from "@/lib/partner-content-search/ingestion/chunk-counts";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  type PartnerContentIngestionMode,
} from "@/lib/partner-content-search/ingestion/enqueue";
import type { NormalizedPartnerContentItem } from "@/lib/partner-content-search/ingestion/normalize-content";
import type { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function isTranscriptEligibleContentItem(
  item: NormalizedPartnerContentItem,
) {
  return item.transcriptEligible !== false;
}

export async function writeFetchedContentItems({
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
        viewCount: toNullableBigInt(item.viewCount),
        likeCount: toNullableBigInt(item.likeCount),
        commentCount: toNullableBigInt(item.commentCount),
        shareCount: toNullableBigInt(item.shareCount),
        saveCount: toNullableBigInt(item.saveCount),
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

// Post-commit dispatch: items are already written, so a dropped batch strands
// transcript/embed jobs. Log + rethrow (withCron 500); dedup ids keep retry safe.
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

  // Batch changed items + new chunks into one transaction instead of per-item
  // (which fanned out to ~100-250 serial round-trips on a full backfill).
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
          url: sourceItem.url,
          title: sourceItem.title,
          description: sourceItem.description,
          thumbnailUrl: sourceItem.thumbnailUrl,
          publishedAt: sourceItem.publishedAt,
          durationMs: sourceItem.durationMs,
          viewCount: toNullableBigInt(sourceItem.viewCount),
          likeCount: toNullableBigInt(sourceItem.likeCount),
          commentCount: toNullableBigInt(sourceItem.commentCount),
          shareCount: toNullableBigInt(sourceItem.shareCount),
          saveCount: toNullableBigInt(sourceItem.saveCount),
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

function toNullableBigInt(value: number | null) {
  return value === null ? null : BigInt(Math.trunc(value));
}
