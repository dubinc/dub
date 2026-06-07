import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { PARTNER_CONTENT_SEARCH_MODELS } from "@/lib/partner-content-search/constants";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  partnerContentEmbedPayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { embedPartnerContentTexts } from "@/lib/partner-content-search/voyage";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EMBED_RATE_LIMIT_RETRY_DELAY_SECONDS = 120;

type UnembeddedChunk = {
  id: string;
  text: string;
};

type EmbeddedChunkCount = {
  embeddedChunkCount: bigint;
};

// POST /api/cron/partner-content/embed
export const POST = withCron(async ({ rawBody }) => {
  const payload = partnerContentEmbedPayloadSchema.parse(JSON.parse(rawBody));

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
      transcriptFetchStatus: true,
      totalChunkCount: true,
      embeddedChunkCount: true,
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

  if (
    contentItem.transcriptFetchStatus !== "fetched" ||
    contentItem.totalChunkCount === 0
  ) {
    return NextResponse.json({
      success: true,
      mode: payload.mode,
      runStamp: payload.runStamp,
      skipped: true,
      reason: "Content item has no fetched transcript chunks to embed.",
      contentItem,
    });
  }

  const chunks = await prisma.$queryRaw<UnembeddedChunk[]>`
    SELECT id, text
    FROM PartnerContentChunk
    WHERE partnerContentItemId = ${contentItem.id}
      AND embedding IS NULL
    ORDER BY chunkIndex ASC
    LIMIT ${payload.maxChunks}
  `;

  if (chunks.length === 0) {
    const embeddedChunkCount = await refreshEmbeddedChunkCount(contentItem.id);

    return NextResponse.json({
      success: true,
      mode: payload.mode,
      runStamp: payload.runStamp,
      skipped: true,
      reason: "All chunks are already embedded.",
      embeddedChunkCount,
      contentItem: {
        ...contentItem,
        embeddedChunkCount,
      },
    });
  }

  let embeddings: number[][];

  try {
    embeddings = await embedPartnerContentTexts({
      input: chunks.map(({ text }) => text),
      inputType: "document",
    });
  } catch (error) {
    if (!isVoyageRateLimitError(error)) throw error;

    const response = await qstash.publishJSON({
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

    return NextResponse.json({
      success: true,
      mode: payload.mode,
      runStamp: payload.runStamp,
      rateLimited: true,
      retryScheduled: true,
      retryMessageId: response.messageId,
      contentItem: {
        id: contentItem.id,
        transcriptFetchStatus: contentItem.transcriptFetchStatus,
        totalChunkCount: contentItem.totalChunkCount,
        embeddedChunkCount: contentItem.embeddedChunkCount,
      },
    });
  }

  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Voyage returned ${embeddings.length} embeddings for ${chunks.length} chunks.`,
    );
  }

  await Promise.all(
    chunks.map((chunk, index) =>
      prisma.$executeRaw`
        UPDATE PartnerContentChunk
        SET embedding = TO_VECTOR(${serializeEmbedding(embeddings[index])}),
            embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.model}
        WHERE id = ${chunk.id}
      `,
    ),
  );

  const embeddedChunkCount = await refreshEmbeddedChunkCount(contentItem.id);
  const remainingChunkCount = Math.max(
    0,
    contentItem.totalChunkCount - embeddedChunkCount,
  );

  let continuationMessageId: string | undefined;

  if (remainingChunkCount > 0) {
    const response = await qstash.publishJSON({
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

    continuationMessageId = response.messageId;
  }

  return NextResponse.json({
    success: true,
    mode: payload.mode,
    runStamp: payload.runStamp,
    embeddedNow: chunks.length,
    embeddedChunkCount,
    totalChunkCount: contentItem.totalChunkCount,
    remainingChunkCount,
    continuationMessageId,
    contentItem: {
      id: contentItem.id,
      transcriptFetchStatus: contentItem.transcriptFetchStatus,
      totalChunkCount: contentItem.totalChunkCount,
      embeddedChunkCount,
    },
  });
});

async function enqueueEmbedJobsForPartnerPlatform({
  mode,
  runStamp,
  partnerId,
  partnerPlatformId,
  limitContentItems,
  maxChunks,
}: {
  mode: "incremental" | "backfill";
  runStamp: string;
  partnerId: string;
  partnerPlatformId?: string;
  limitContentItems: number;
  maxChunks: number;
}) {
  if (!partnerPlatformId) {
    return logAndRespond(
      `[PartnerContentSearch] Embed enqueue requires partnerPlatformId for ${mode} run ${runStamp}.`,
      { status: 400, logLevel: "warn" },
    );
  }

  const contentItems = await prisma.partnerContentItem.findMany({
    where: {
      partnerId,
      partnerPlatformId,
      transcriptFetchStatus: "fetched",
      totalChunkCount: {
        gt: 0,
      },
    },
    select: {
      id: true,
      totalChunkCount: true,
      embeddedChunkCount: true,
    },
    orderBy: {
      id: "asc",
    },
    take: limitContentItems,
  });

  const pendingContentItems = contentItems.filter(
    ({ totalChunkCount, embeddedChunkCount }) =>
      embeddedChunkCount < totalChunkCount,
  );

  const messages = pendingContentItems.map((contentItem) => ({
    url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.embed),
    method: "POST" as const,
    flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
    body: {
      mode,
      runStamp,
      partnerId,
      partnerContentItemId: contentItem.id,
      maxChunks,
    },
    deduplicationId: createPartnerContentDeduplicationId(
      "partner-content-embed",
      mode,
      runStamp,
      contentItem.id,
    ),
  }));

  const qstashResponses =
    messages.length === 0 ? [] : await qstash.batchJSON(messages);

  return NextResponse.json({
    success: true,
    mode,
    runStamp,
    partnerId,
    partnerPlatformId,
    inspectedContentItemCount: contentItems.length,
    embedJobCount: messages.length,
    pendingContentItemCount: pendingContentItems.length,
    flowControl: PARTNER_CONTENT_EMBED_FLOW_CONTROL,
    qstashResponses,
    contentItems: pendingContentItems,
  });
}

async function refreshEmbeddedChunkCount(partnerContentItemId: string) {
  const [result] = await prisma.$queryRaw<EmbeddedChunkCount[]>`
    SELECT COUNT(*) AS embeddedChunkCount
    FROM PartnerContentChunk
    WHERE partnerContentItemId = ${partnerContentItemId}
      AND embedding IS NOT NULL
  `;

  const embeddedChunkCount = Number(result?.embeddedChunkCount ?? 0);

  await prisma.partnerContentItem.update({
    where: {
      id: partnerContentItemId,
    },
    data: {
      embeddedChunkCount,
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.model,
    },
  });

  return embeddedChunkCount;
}

function serializeEmbedding(embedding: number[]) {
  const expectedDimensions = PARTNER_CONTENT_SEARCH_MODELS.embedding.dimensions;

  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `Expected ${expectedDimensions} embedding dimensions, received ${embedding.length}.`,
    );
  }

  return JSON.stringify(
    embedding.map((value) => {
      if (!Number.isFinite(value)) {
        throw new Error("Voyage returned a non-finite embedding value.");
      }

      return value;
    }),
  );
}

function isVoyageRateLimitError(error: unknown) {
  return error instanceof Error && error.message.includes("failed: 429");
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
