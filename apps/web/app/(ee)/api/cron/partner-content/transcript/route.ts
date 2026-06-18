import { createId } from "@/lib/api/create-id";
import { getInstagramMediaTranscript } from "@/lib/api/scrape-creators/get-instagram-media-transcript";
import { getTikTokVideoTranscript } from "@/lib/api/scrape-creators/get-tiktok-video-transcript";
import { getYouTubeVideoTranscript } from "@/lib/api/scrape-creators/get-youtube-video-transcript";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import {
  chunkTranscriptSegments,
  hashTranscript,
} from "@/lib/partner-content-search/chunk-transcript";
import { PARTNER_CONTENT_SEARCH_MODELS } from "@/lib/partner-content-search/constants";
import { refreshPartnerContentItemChunkCounts } from "@/lib/partner-content-search/ingestion/chunk-counts";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  parsePartnerContentCronPayload,
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  PartnerContentIngestionMode,
  partnerContentTranscriptPayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import {
  normalizeInstagramTranscriptSegments,
  normalizeTikTokTranscriptSegments,
  normalizeYouTubeTranscriptSegments,
} from "@/lib/partner-content-search/ingestion/normalize-content";
import { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/partner-content/transcript
export const POST = withCron(async ({ rawBody }) => {
  const payload = parsePartnerContentCronPayload(
    partnerContentTranscriptPayloadSchema,
    rawBody,
  );
  if (payload instanceof Response) return payload;

  const contentItem = await prisma.partnerContentItem.findUnique({
    where: {
      id: payload.partnerContentItemId,
    },
    select: {
      id: true,
      partnerId: true,
      partnerPlatformId: true,
      platformContentId: true,
      url: true,
      title: true,
      transcriptFetchStatus: true,
    },
  });

  if (!contentItem) {
    return logAndRespond(
      `[PartnerContentSearch] Content item ${payload.partnerContentItemId} not found for ${payload.mode} run ${payload.runStamp}.`,
      { status: 404, logLevel: "warn" },
    );
  }

  if (
    contentItem.partnerId !== payload.partnerId ||
    contentItem.partnerPlatformId !== payload.partnerPlatformId
  ) {
    return logAndRespond(
      `[PartnerContentSearch] Content item ${payload.partnerContentItemId} did not match transcript payload for ${payload.mode} run ${payload.runStamp}.`,
      { status: 400, logLevel: "warn" },
    );
  }

  // QStash delivers at least once. If this transcript was already fetched and
  // chunked, skip the (credit-burning) ScrapeCreators re-fetch — but still
  // (re-)enqueue the embed job so a previously-failed enqueue is recovered on
  // redelivery. Admin re-ingestion can force a fresh fetch via forceRefetch.
  if (
    contentItem.transcriptFetchStatus === "fetched" &&
    !payload.forceRefetch
  ) {
    await enqueueEmbedJob({
      mode: payload.mode,
      runStamp: payload.runStamp,
      partnerId: contentItem.partnerId,
      partnerContentItemId: contentItem.id,
    });

    return logAndRespond(
      `[PartnerContentSearch] Content item ${contentItem.id} already transcribed; re-enqueued embed for ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  let transcriptWriteResult: Awaited<ReturnType<typeof writeTranscriptChunks>>;

  try {
    transcriptWriteResult = await writeTranscriptChunks({
      ...contentItem,
      platform: payload.platform,
    });
  } catch (error) {
    await prisma.partnerContentItem.update({
      where: {
        id: contentItem.id,
      },
      data: {
        transcriptFetchStatus: "error",
        transcriptLastAttemptedAt: new Date(),
      },
    });

    throw error;
  }

  if (!transcriptWriteResult.transcriptAvailable) {
    return logAndRespond(
      `[PartnerContentSearch] No transcript available for content item ${contentItem.id} on ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  await enqueueEmbedJob({
    mode: payload.mode,
    runStamp: payload.runStamp,
    partnerId: contentItem.partnerId,
    partnerContentItemId: contentItem.id,
  });

  return logAndRespond(
    `[PartnerContentSearch] Transcribed content item ${contentItem.id}: ${transcriptWriteResult.chunkCount} chunks (${transcriptWriteResult.chunksCreated} created), embed enqueued for ${payload.mode} run ${payload.runStamp}.`,
  );
});

async function writeTranscriptChunks(contentItem: {
  id: string;
  partnerId: string;
  url: string;
  platform: PartnerContentPlatform;
}) {
  const transcriptSegments = await fetchTranscriptSegments({
    platform: contentItem.platform,
    url: contentItem.url,
  });
  const normalizedTranscript = transcriptSegments
    .map(({ text }) => text.trim())
    .filter(Boolean)
    .join(" ");
  const transcriptHash =
    transcriptSegments.length > 0 ? hashTranscript(transcriptSegments) : null;

  if (!transcriptHash) {
    await prisma.partnerContentItem.update({
      where: {
        id: contentItem.id,
      },
      data: {
        transcriptFetchStatus: "notAvailable",
        transcriptLastAttemptedAt: new Date(),
        normalizedTranscript: null,
        transcriptHash: null,
        transcriptHasTimestamps: false,
        totalChunkCount: 0,
        embeddedChunkCount: 0,
      },
    });

    await prisma.partnerContentChunk.deleteMany({
      where: {
        partnerContentItemId: contentItem.id,
        source: "transcript",
      },
    });

    await refreshPartnerContentItemChunkCounts(contentItem.id);

    return {
      transcriptAvailable: false,
      segmentCount: 0,
      normalizedTranscriptLength: 0,
      transcriptHash: null,
      chunkCount: 0,
      chunksCreated: 0,
    };
  }

  const chunks = chunkTranscriptSegments(transcriptSegments);
  const transcriptHasTimestamps = transcriptSegments.some(
    ({ startMs, endMs }) => startMs !== null || endMs !== null,
  );
  const embeddingModel = PARTNER_CONTENT_SEARCH_MODELS.embedding.id;

  const [, deletedChunks, createChunksResult] = await prisma.$transaction([
    prisma.partnerContentItem.update({
      where: {
        id: contentItem.id,
      },
      data: {
        transcriptFetchStatus: "fetched",
        transcriptLastAttemptedAt: new Date(),
        normalizedTranscript,
        transcriptHash,
        transcriptHasTimestamps,
        embeddingModel,
        lastFetchedAt: new Date(),
      },
    }),
    prisma.partnerContentChunk.deleteMany({
      where: {
        partnerContentItemId: contentItem.id,
        source: "transcript",
      },
    }),
    prisma.partnerContentChunk.createMany({
      data: chunks.map((chunk) => ({
        id: createId({ prefix: "pcc_" }),
        partnerContentItemId: contentItem.id,
        partnerId: contentItem.partnerId,
        source: "transcript",
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
        textHash: transcriptHash,
        embeddingModel,
      })),
    }),
  ]);

  await refreshPartnerContentItemChunkCounts(contentItem.id);

  return {
    transcriptAvailable: true,
    segmentCount: transcriptSegments.length,
    normalizedTranscriptLength: normalizedTranscript.length,
    transcriptHash,
    chunkCount: chunks.length,
    chunksDeleted: deletedChunks.count,
    chunksCreated: createChunksResult.count,
  };
}

async function fetchTranscriptSegments({
  platform,
  url,
}: {
  platform: PartnerContentPlatform;
  url: string;
}) {
  switch (platform) {
    case "youtube": {
      const transcriptResponse = await getYouTubeVideoTranscript({ url });
      return normalizeYouTubeTranscriptSegments(transcriptResponse.transcript);
    }
    case "tiktok": {
      const transcriptResponse = await getTikTokVideoTranscript({ url });
      return normalizeTikTokTranscriptSegments(transcriptResponse.transcript);
    }
    case "instagram": {
      const transcriptResponse = await getInstagramMediaTranscript({ url });
      return normalizeInstagramTranscriptSegments(transcriptResponse);
    }
  }
}

async function enqueueEmbedJob({
  mode,
  runStamp,
  partnerId,
  partnerContentItemId,
}: {
  mode: PartnerContentIngestionMode;
  runStamp: string;
  partnerId: string;
  partnerContentItemId: string;
}) {
  try {
    await qstash.publishJSON({
      url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.embed),
      method: "POST",
      body: {
        mode,
        runStamp,
        partnerId,
        partnerContentItemId,
      },
      flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
      deduplicationId: createPartnerContentDeduplicationId(
        "partner-content-embed",
        mode,
        runStamp,
        partnerContentItemId,
      ),
    });
  } catch (error) {
    // Don't swallow this: the transcript chunks are already committed, so a
    // dropped embed job leaves them permanently unsearchable. Rethrow so
    // withCron returns 500 and QStash retries the whole transcript job — the
    // forceRefetch=false guard above makes that retry skip the re-fetch and
    // just re-enqueue here, and the embed deduplicationId keeps it idempotent.
    console.error("[PartnerContentSearch] Failed to enqueue embed job", {
      error,
      mode,
      runStamp,
      partnerId,
      partnerContentItemId,
    });

    throw error;
  }
}
