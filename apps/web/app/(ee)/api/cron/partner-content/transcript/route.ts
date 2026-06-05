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
  partnerContentTranscriptPayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { normalizeYouTubeTranscriptSegments } from "@/lib/partner-content-search/ingestion/normalize-content";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/partner-content/transcript
export const POST = withCron(async ({ rawBody }) => {
  const payload = partnerContentTranscriptPayloadSchema.parse(
    JSON.parse(rawBody),
  );

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

  try {
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
      const updatedContentItem = await prisma.partnerContentItem.update({
        where: {
          id: contentItem.id,
        },
        data: {
          transcriptFetchStatus: "notAvailable",
          transcriptLastAttemptedAt: new Date(),
          normalizedTranscript: null,
          transcriptHash: null,
          hasTimestamps: false,
          totalChunkCount: 0,
          embeddedChunkCount: 0,
        },
        select: {
          id: true,
          transcriptFetchStatus: true,
          totalChunkCount: true,
          embeddedChunkCount: true,
        },
      });

      await prisma.partnerContentChunk.deleteMany({
        where: {
          partnerContentItemId: contentItem.id,
        },
      });

      return NextResponse.json({
        success: true,
        mode: payload.mode,
        runStamp: payload.runStamp,
        dryRun: payload.dryRun,
        writesEnabled: true,
        transcriptAvailable: false,
        segmentCount: 0,
        normalizedTranscriptLength: 0,
        transcriptHash: null,
        chunkCount: 0,
        chunksCreated: 0,
        contentItem: updatedContentItem,
      });
    }

    const chunks = chunkTranscriptSegments(transcriptSegments);
    const hasTimestamps = transcriptSegments.some(
      ({ startMs, endMs }) => startMs !== null || endMs !== null,
    );
    const embeddingModel = PARTNER_CONTENT_SEARCH_MODELS.embedding.model;

    const [updatedContentItem, deletedChunks, createChunksResult] =
      await prisma.$transaction([
        prisma.partnerContentItem.update({
          where: {
            id: contentItem.id,
          },
          data: {
            transcriptFetchStatus: "fetched",
            transcriptLastAttemptedAt: new Date(),
            normalizedTranscript,
            transcriptHash,
            hasTimestamps,
            embeddingModel,
            totalChunkCount: chunks.length,
            embeddedChunkCount: 0,
            lastFetchedAt: new Date(),
          },
          select: {
            id: true,
            transcriptFetchStatus: true,
            transcriptHash: true,
            totalChunkCount: true,
            embeddedChunkCount: true,
            hasTimestamps: true,
            lastFetchedAt: true,
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
            text: chunk.text,
            startMs: chunk.startMs,
            endMs: chunk.endMs,
            transcriptHash,
            embeddingModel,
          })),
        }),
      ]);

    const embedJob = await qstash.publishJSON({
      url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.embed),
      method: "POST",
      body: {
        mode: payload.mode,
        runStamp: payload.runStamp,
        partnerId: contentItem.partnerId,
        partnerContentItemId: contentItem.id,
      },
      flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
      deduplicationId: createPartnerContentDeduplicationId(
        "partner-content-embed",
        payload.mode,
        payload.runStamp,
        contentItem.id,
      ),
    });

    return NextResponse.json({
      success: true,
      mode: payload.mode,
      runStamp: payload.runStamp,
      dryRun: payload.dryRun,
      writesEnabled: true,
      transcriptAvailable: true,
      segmentCount: transcriptSegments.length,
      normalizedTranscriptLength: normalizedTranscript.length,
      transcriptHash,
      chunkCount: chunks.length,
      chunksDeleted: deletedChunks.count,
      chunksCreated: createChunksResult.count,
      embedJob,
      sampleSegments: transcriptSegments.slice(0, 5),
      sampleChunks: chunks.slice(0, 3),
      contentItem: updatedContentItem,
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
});
