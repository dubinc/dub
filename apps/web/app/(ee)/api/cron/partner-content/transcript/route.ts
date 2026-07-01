import { withCron } from "@/lib/cron/with-cron";
import {
  enqueueEmbedJob,
  parsePartnerContentCronPayload,
  partnerContentTranscriptPayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { fetchAndWriteTranscriptChunks } from "@/lib/partner-content-search/ingestion/fetch-and-write-transcript-chunks";
import { prisma } from "@/lib/prisma";
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

  // QStash delivers at least once. If already fetched+chunked, skip the credit-burning
  // re-fetch but still re-enqueue embed (recovers a previously-failed enqueue).
  // forceRefetch forces a fresh fetch.
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

  let transcriptResult: Awaited<
    ReturnType<typeof fetchAndWriteTranscriptChunks>
  >;

  try {
    transcriptResult = await fetchAndWriteTranscriptChunks({
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

  if (!transcriptResult.transcriptAvailable) {
    await enqueueEmbedJob({
      mode: payload.mode,
      runStamp: payload.runStamp,
      partnerId: contentItem.partnerId,
      partnerContentItemId: contentItem.id,
    });

    return logAndRespond(
      `[PartnerContentSearch] No transcript available for content item ${contentItem.id}; re-enqueued embed for existing chunks on ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  await enqueueEmbedJob({
    mode: payload.mode,
    runStamp: payload.runStamp,
    partnerId: contentItem.partnerId,
    partnerContentItemId: contentItem.id,
  });

  return logAndRespond(
    `[PartnerContentSearch] Transcribed content item ${contentItem.id}: ${transcriptResult.chunkCount} chunks (${transcriptResult.chunksCreated} created), embed enqueued for ${payload.mode} run ${payload.runStamp}.`,
  );
});
