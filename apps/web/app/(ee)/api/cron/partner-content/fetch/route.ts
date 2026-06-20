import { withCron } from "@/lib/cron/with-cron";
import {
  parsePartnerContentCronPayload,
  partnerContentFetchPayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { fetchRecentPlatformContent } from "@/lib/partner-content-search/ingestion/platforms";
import {
  isTranscriptEligibleContentItem,
  writeFetchedContentItems,
} from "@/lib/partner-content-search/ingestion/write-fetched-content-items";
import { prisma } from "@/lib/prisma";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  if (!partnerPlatform.verifiedAt && !payload.ignoreUnverified) {
    return logAndRespond(
      `[PartnerContentSearch] Partner platform ${partnerPlatform.id} is unverified; pass ignoreUnverified=true for a manual ${payload.mode} fetch on run ${payload.runStamp}.`,
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
