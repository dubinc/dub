import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import {
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS,
  PARTNER_CONTENT_SEARCH_ROUTES,
  partnerContentEnumeratePagePayloadSchema,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/partner-content/enumerate/page
export const POST = withCron(async ({ rawBody }) => {
  const payload = partnerContentEnumeratePagePayloadSchema.parse(
    JSON.parse(rawBody),
  );

  const partners = await prisma.partner.findMany({
    where: {
      id: {
        in: payload.partnerIds,
      },
    },
    select: {
      id: true,
      platforms: {
        where: buildEligiblePartnerPlatformWhere(payload),
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

  const qstashResponses = payload.dryRun
    ? []
    : await qstash.batchJSON(fetchMessages);

  return NextResponse.json({
    success: true,
    mode: payload.mode,
    runStamp: payload.runStamp,
    dryRun: payload.dryRun,
    partnerCount: partners.length,
    partnerPlatformCount: partnerPlatforms.length,
    fetchJobCount: fetchMessages.length,
    qstashResponses,
    partnerPlatforms,
  });
});

function buildEligiblePartnerPlatformWhere({
  mode,
  filter,
}: {
  mode: "incremental" | "backfill";
  filter: {
    platforms: Array<"youtube" | "instagram" | "tiktok">;
  };
}): Prisma.PartnerPlatformWhereInput {
  const incrementalCutoff = new Date(
    Date.now() - PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS * 24 * 60 * 60 * 1000,
  );

  return {
    type: {
      in: filter.platforms,
    },
    verifiedAt: {
      not: null,
    },
    ...(mode === "incremental" && {
      OR: [
        {
          contentLastFetchedAt: null,
        },
        {
          contentLastFetchedAt: {
            lt: incrementalCutoff,
          },
        },
      ],
    }),
  };
}
