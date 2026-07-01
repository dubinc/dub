import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { PARTNER_CONTENT_SEARCH_MODELS } from "@/lib/partner-content-search/constants";
import { refreshPartnerContentItemChunkCounts } from "@/lib/partner-content-search/ingestion/chunk-counts";
import {
  createPartnerContentDeduplicationId,
  enqueueEmbedJobsForPartnerPlatform,
  getPartnerContentUrl,
  parsePartnerContentCronPayload,
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  partnerContentEmbedPayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import {
  embedPartnerContentTexts,
  serializeEmbeddingForVector,
  VoyageApiError,
} from "@/lib/partner-content-search/voyage";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EMBED_RATE_LIMIT_RETRY_DELAY_SECONDS = 120;
const EMBED_UPDATE_BATCH_SIZE = 16;

type UnembeddedChunk = {
  id: string;
  chunkText: string;
};

// POST /api/cron/partner-content/embed
export const POST = withCron(async ({ rawBody }) => {
  const payload = parsePartnerContentCronPayload(
    partnerContentEmbedPayloadSchema,
    rawBody,
  );
  if (payload instanceof Response) return payload;

  if (!payload.partnerContentItemId) {
    return enqueueEmbedJobsForPartnerPlatform(payload);
  }

  const contentItem = await prisma.partnerContentItem.findUnique({
    where: {
      id: payload.partnerContentItemId,
    },
    select: {
      id: true,
      partnerId: true,
      totalChunkCount: true,
      embeddedChunkCount: true,
      // need country and platform type for denormalized pre-filter columns
      partner: {
        select: {
          country: true,
        },
      },
      partnerPlatform: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!contentItem) {
    return logAndRespond(
      `[PartnerContentSearch] Content item ${payload.partnerContentItemId} not found for ${payload.mode} embed run ${payload.runStamp}.`,
      { status: 404, logLevel: "warn" },
    );
  }

  if (contentItem.partnerId !== payload.partnerId) {
    return logAndRespond(
      `[PartnerContentSearch] Content item ${payload.partnerContentItemId} did not match embed payload for ${payload.mode} run ${payload.runStamp}.`,
      { status: 400, logLevel: "warn" },
    );
  }

  if (contentItem.totalChunkCount === 0) {
    return logAndRespond(
      `[PartnerContentSearch] Skipping embed for content item ${contentItem.id}: no chunks for ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  const chunks = await prisma.$queryRaw<UnembeddedChunk[]>`
    SELECT id, chunkText
    FROM PartnerContentChunk
    WHERE partnerContentItemId = ${contentItem.id}
      AND embedding IS NULL
      AND embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
    ORDER BY source ASC, chunkIndex ASC
    LIMIT ${payload.maxChunks}
  `;

  if (chunks.length === 0) {
    const embeddedChunkCount = await refreshEmbeddedChunkCount(contentItem.id);

    return logAndRespond(
      `[PartnerContentSearch] Content item ${contentItem.id} already fully embedded (${embeddedChunkCount}/${contentItem.totalChunkCount}) for ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  let embeddings: number[][];

  try {
    embeddings = await embedPartnerContentTexts({
      input: chunks.map(({ chunkText }) => chunkText),
      inputType: "document",
    });
  } catch (error) {
    if (!isVoyageRateLimitError(error)) throw error;

    await qstash.publishJSON({
      url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.embed),
      method: "POST",
      body: {
        mode: payload.mode,
        runStamp: payload.runStamp,
        partnerId: payload.partnerId,
        partnerContentItemId: contentItem.id,
        maxChunks: payload.maxChunks,
      },
      flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
      delay: getRateLimitRetryDelaySeconds(contentItem.id),
      deduplicationId: createPartnerContentDeduplicationId(
        "partner-content-embed-rate-limit-retry",
        payload.mode,
        payload.runStamp,
        contentItem.id,
      ),
    });

    return logAndRespond(
      `[PartnerContentSearch] Voyage rate-limited embed for content item ${contentItem.id}; retry scheduled for ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Voyage returned ${embeddings.length} embeddings for ${chunks.length} chunks.`,
    );
  }

  // Denormalized pre-filter values saved with embeddings. Both are ~static
  const country = contentItem.partner.country;
  const platformType = contentItem.partnerPlatform.type;

  const updates = chunks.map(
    (contentChunk, index) =>
      prisma.$executeRaw`
        UPDATE PartnerContentChunk
        SET embedding = TO_VECTOR(${serializeEmbeddingForVector(embeddings[index])}),
            embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id},
            country = ${country},
            platformType = ${platformType}
        WHERE id = ${contentChunk.id}
      `,
  );

  for (const batch of chunk(updates, EMBED_UPDATE_BATCH_SIZE)) {
    await Promise.all(batch);
  }

  const embeddedChunkCount = await refreshEmbeddedChunkCount(contentItem.id);
  const remainingChunkCount = Math.max(
    0,
    contentItem.totalChunkCount - embeddedChunkCount,
  );

  if (remainingChunkCount > 0) {
    await qstash.publishJSON({
      url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.embed),
      method: "POST",
      body: {
        mode: payload.mode,
        runStamp: payload.runStamp,
        partnerId: payload.partnerId,
        partnerContentItemId: contentItem.id,
        maxChunks: payload.maxChunks,
      },
      flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
      deduplicationId: createPartnerContentDeduplicationId(
        "partner-content-embed",
        payload.mode,
        payload.runStamp,
        contentItem.id,
        embeddedChunkCount,
      ),
    });
  }

  return logAndRespond(
    `[PartnerContentSearch] Embedded ${chunks.length} chunks for content item ${contentItem.id} (${embeddedChunkCount}/${contentItem.totalChunkCount}, ${remainingChunkCount} remaining) on ${payload.mode} run ${payload.runStamp}.`,
  );
});

async function refreshEmbeddedChunkCount(partnerContentItemId: string) {
  const { embeddedChunkCount } =
    await refreshPartnerContentItemChunkCounts(partnerContentItemId);

  return embeddedChunkCount;
}

function isVoyageRateLimitError(error: unknown) {
  return error instanceof VoyageApiError && error.status === 429;
}

function getRateLimitRetryDelaySeconds(contentItemId: string) {
  return (
    EMBED_RATE_LIMIT_RETRY_DELAY_SECONDS +
    (getStableNumericHash(contentItemId) % 120)
  );
}

function getStableNumericHash(value: string) {
  return Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
}
