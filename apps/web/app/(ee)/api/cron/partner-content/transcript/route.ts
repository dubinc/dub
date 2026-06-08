import { getYouTubeVideoTranscript } from "@/lib/api/scrape-creators/get-youtube-video-transcript";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { PARTNER_CONTENT_SEARCH_MODELS } from "@/lib/partner-content-search/constants";
import {
  chunkTranscriptSegments,
  hashTranscript,
} from "@/lib/partner-content-search/chunk-transcript";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  parsePartnerContentCronPayload,
  partnerContentTranscriptPayloadSchema,
  PartnerContentIngestionMode,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { normalizeYouTubeTranscriptSegments } from "@/lib/partner-content-search/ingestion/normalize-content";
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

  if (payload.platform !== "youtube") {
    return logAndRespond(
      `[PartnerContentSearch] Transcript fetch only supports YouTube right now. Received ${payload.platform} for ${payload.mode} run ${payload.runStamp}.`,
      { status: 501, logLevel: "warn" },
    );
  }

  let transcriptWriteResult: Awaited<
    ReturnType<typeof writeTranscriptChunks>
  >;

  try {
    transcriptWriteResult = await writeTranscriptChunks(contentItem);
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

  const { embedEnqueueStatus } = await enqueueEmbedJob({
    mode: payload.mode,
    runStamp: payload.runStamp,
    partnerId: contentItem.partnerId,
    partnerContentItemId: contentItem.id,
  });

  return logAndRespond(
    `[PartnerContentSearch] Transcribed content item ${contentItem.id}: ${transcriptWriteResult.chunkCount} chunks (${transcriptWriteResult.chunksCreated} created), embed enqueue ${embedEnqueueStatus} for ${payload.mode} run ${payload.runStamp}.`,
  );
});

async function writeTranscriptChunks(contentItem: {
  id: string;
  partnerId: string;
  url: string;
}) {
  const transcriptResponse = await getYouTubeVideoTranscript({
    url: contentItem.url,
  });

  const transcriptSegments = normalizeYouTubeTranscriptSegments(
    transcriptResponse.transcript,
  );
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
      },
    });

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
  const embeddingModel = PARTNER_CONTENT_SEARCH_MODELS.embedding.model;

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
        totalChunkCount: chunks.length,
        embeddedChunkCount: 0,
        lastFetchedAt: new Date(),
      },
    }),
    prisma.partnerContentChunk.deleteMany({
      where: {
        partnerContentItemId: contentItem.id,
      },
    }),
    prisma.partnerContentChunk.createMany({
      data: chunks.map((chunk) => ({
        partnerContentItemId: contentItem.id,
        partnerId: contentItem.partnerId,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
        transcriptHash,
        embeddingModel,
      })),
    }),
  ]);

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

    return { embedEnqueueStatus: "enqueued" as const };
  } catch (error) {
    console.error("[PartnerContentSearch] Failed to enqueue embed job", {
      error,
      mode,
      runStamp,
      partnerId,
      partnerContentItemId,
    });

    return { embedEnqueueStatus: "failed" as const };
  }
}
