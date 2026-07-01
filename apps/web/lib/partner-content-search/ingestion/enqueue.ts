import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import "server-only";
import type {
  PartnerContentEnumeratePayload,
  PartnerContentIngestionMode,
} from "./payload-schemas";
import {
  PARTNER_CONTENT_EMBED_FLOW_CONTROL,
  PARTNER_CONTENT_SEARCH_ROUTES,
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
} from "./routes";

// Re-export every symbol previously defined here so existing import paths stay
// valid with zero call-site changes.
export * from "./payload-schemas";
export * from "./routes";
export * from "./eligibility-where";

export async function enqueuePartnerContentEnumerate(
  payload: PartnerContentEnumeratePayload,
) {
  return await qstash.publishJSON({
    url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.enumerate),
    method: "POST",
    body: payload,
    deduplicationId: createPartnerContentDeduplicationId(
      "partner-content-enumerate",
      payload.mode,
      payload.runStamp,
    ),
  });
}

// Enqueue one embed job for an already-chunked item. Throws on publish failure so
// the caller fails the job and QStash retries (else chunks stay unsearchable).
export async function enqueueEmbedJob({
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
    // Don't swallow: chunks are already committed, so a dropped embed leaves them
    // unsearchable. Rethrow → withCron 500 → QStash retries; forceRefetch=false skips
    // the re-fetch and the embed dedup id keeps it idempotent.
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

// Fan out one embed job per pending content item on a partner platform.
export async function enqueueEmbedJobsForPartnerPlatform({
  mode,
  runStamp,
  partnerId,
  partnerPlatformId,
  limitContentItems,
  maxChunks,
}: {
  mode: PartnerContentIngestionMode;
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

  if (messages.length > 0) {
    await qstash.batchJSON(messages);
  }

  return logAndRespond(
    `[PartnerContentSearch] Enqueued ${messages.length} embed jobs (${pendingContentItems.length} pending of ${contentItems.length} inspected) for partner platform ${partnerPlatformId} on ${mode} run ${runStamp}.`,
  );
}
