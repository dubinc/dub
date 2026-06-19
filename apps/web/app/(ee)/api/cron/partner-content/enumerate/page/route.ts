import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import {
  buildEligiblePartnerPlatformWhere,
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  parsePartnerContentCronPayload,
  PARTNER_CONTENT_SEARCH_ROUTES,
  partnerContentEnumeratePagePayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/partner-content/enumerate/page
export const POST = withCron(async ({ rawBody }) => {
  const payload = parsePartnerContentCronPayload(
    partnerContentEnumeratePagePayloadSchema,
    rawBody,
  );
  if (payload instanceof Response) return payload;

  const partners = await prisma.partner.findMany({
    where: {
      id: {
        in: payload.partnerIds,
      },
    },
    select: {
      id: true,
      platforms: {
        where: buildEligiblePartnerPlatformWhere({
          mode: payload.mode,
          platforms: payload.filter.platforms,
        }),
        select: {
          id: true,
          partnerId: true,
          type: true,
          identifier: true,
          platformId: true,
          contentLastFetchedAt: true,
          latestContentUrl: true,
        },
        orderBy: {
          type: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const partnerPlatforms = partners.flatMap(({ id: partnerId, platforms }) =>
    platforms.map((platform) => ({
      partnerId,
      partnerPlatformId: platform.id,
      type: platform.type,
      identifier: platform.identifier,
      platformId: platform.platformId,
      contentLastFetchedAt: platform.contentLastFetchedAt,
      latestContentUrl: platform.latestContentUrl,
    })),
  );

  if (partnerPlatforms.length === 0) {
    return logAndRespond(
      `[PartnerContentSearch] No eligible partner platforms found for ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  const fetchMessages = partnerPlatforms.map((partnerPlatform) => ({
    url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.fetch),
    method: "POST" as const,
    deduplicationId: createPartnerContentDeduplicationId(
      "partner-content-fetch",
      payload.mode,
      payload.runStamp,
      partnerPlatform.partnerPlatformId,
    ),
    body: {
      mode: payload.mode,
      runStamp: payload.runStamp,
      dryRun: payload.dryRun,
      forceTranscriptJobs: false,
      partnerId: partnerPlatform.partnerId,
      partnerPlatformId: partnerPlatform.partnerPlatformId,
      platform: partnerPlatform.type,
    },
  }));

  if (!payload.dryRun) {
    for (const slice of chunk(fetchMessages, 100)) {
      await qstash.batchJSON(slice);
    }
  }

  return logAndRespond(
    `[PartnerContentSearch] ${
      payload.dryRun ? "Dry-run enumerated" : "Enqueued"
    } ${fetchMessages.length} fetch jobs across ${
      partnerPlatforms.length
    } platforms (${partners.length} partners) for ${payload.mode} run ${
      payload.runStamp
    }.`,
  );
});
