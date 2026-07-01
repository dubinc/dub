import { createId } from "@/lib/api/create-id";
import {
  chunkTranscriptSegments,
  hashTranscript,
} from "@/lib/partner-content-search/chunk-transcript";
import { PARTNER_CONTENT_SEARCH_MODELS } from "@/lib/partner-content-search/constants";
import { refreshPartnerContentItemChunkCounts } from "@/lib/partner-content-search/ingestion/chunk-counts";
import { fetchPlatformTranscriptSegments } from "@/lib/partner-content-search/ingestion/platforms";
import type { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { prisma } from "@/lib/prisma";

// Fetch a content item's transcript, (re)chunk it, and replace its transcript chunks
// in one transaction. Returns a summary; marks notAvailable when there's no transcript.
export async function fetchAndWriteTranscriptChunks(contentItem: {
  id: string;
  partnerId: string;
  url: string;
  platform: PartnerContentPlatform;
}) {
  const transcriptSegments = await fetchPlatformTranscriptSegments({
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
