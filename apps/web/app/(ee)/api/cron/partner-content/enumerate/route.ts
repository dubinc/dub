import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import {
  buildEligiblePartnerPlatformWhere,
  createPartnerContentDeduplicationId,
  getPartnerContentUrl,
  PARTNER_CONTENT_ENUMERATE_PAGE_SIZE,
  PARTNER_CONTENT_SEARCH_ROUTES,
  parsePartnerContentCronPayload,
  partnerContentEnumeratePayloadSchema,
  PartnerContentIngestionMode,
} from "@/lib/partner-content-search/ingestion/enqueue";
import { PartnerContentPlatform } from "@/lib/partner-content-search/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cron/partner-content/enumerate
export const POST = withCron(async ({ rawBody }) => {
  const payload = parsePartnerContentCronPayload(
    partnerContentEnumeratePayloadSchema,
    rawBody,
  );
  if (payload instanceof Response) return payload;

  // Process a single page per invocation and hand the next cursor back to
  // this same route, rather than draining the whole partner set in one
  // request (keeps each run well under maxDuration regardless of scale).
  const remainingPartners =
    payload.remainingPartners ?? payload.filter.limitPartners;

  const take = Math.min(
    PARTNER_CONTENT_ENUMERATE_PAGE_SIZE,
    remainingPartners ?? PARTNER_CONTENT_ENUMERATE_PAGE_SIZE,
  );

  const partners = await prisma.partner.findMany({
    where: buildEligiblePartnerWhere(payload),
    select: {
      id: true,
    },
    ...(payload.startingAfter && {
      cursor: {
        id: payload.startingAfter,
      },
      skip: 1,
    }),
    orderBy: {
      id: "asc",
    },
    take,
  });

  if (partners.length === 0) {
    return logAndRespond(
      `[PartnerContentSearch] No${
        payload.startingAfter ? " more" : ""
      } eligible partners found for ${payload.mode} run ${payload.runStamp}.`,
    );
  }

  const partnerIds = partners.map(({ id }) => id);
  const lastPartnerId = partnerIds[partnerIds.length - 1];
  const nextRemainingPartners =
    remainingPartners === undefined
      ? undefined
      : remainingPartners - partnerIds.length;

  // Only continue if this page was full and budget (if any) remains.
  const hasMore =
    partners.length === take &&
    (nextRemainingPartners === undefined || nextRemainingPartners > 0);

  const messages = [
    {
      url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.enumeratePage),
      method: "POST" as const,
      deduplicationId: createPartnerContentDeduplicationId(
        "partner-content-enum-page",
        payload.mode,
        partnerIds[0],
        payload.runStamp,
      ),
      body: {
        mode: payload.mode,
        filter: payload.filter,
        runStamp: payload.runStamp,
        dryRun: payload.dryRun,
        partnerIds,
      },
    },
    // Self-continuation hop: re-enter this route from the last id instead of
    // draining the whole partner set in a single invocation.
    ...(hasMore
      ? [
          {
            url: getPartnerContentUrl(PARTNER_CONTENT_SEARCH_ROUTES.enumerate),
            method: "POST" as const,
            deduplicationId: createPartnerContentDeduplicationId(
              "partner-content-enumerate",
              payload.mode,
              payload.runStamp,
              lastPartnerId,
            ),
            body: {
              mode: payload.mode,
              filter: payload.filter,
              runStamp: payload.runStamp,
              dryRun: payload.dryRun,
              startingAfter: lastPartnerId,
              ...(nextRemainingPartners !== undefined && {
                remainingPartners: nextRemainingPartners,
              }),
            },
          },
        ]
      : []),
  ];

  if (!payload.dryRun) {
    await qstash.batchJSON(messages);
  }

  return logAndRespond(
    `[PartnerContentSearch] ${
      payload.dryRun ? "Dry-run enumerated" : "Enqueued"
    } ${partnerIds.length} partners for ${payload.mode} run ${
      payload.runStamp
    }${hasMore ? ` (continuing after ${lastPartnerId})` : " (final page)"}.`,
  );
});

function buildEligiblePartnerWhere({
  mode,
  filter,
}: {
  mode: PartnerContentIngestionMode;
  filter: {
    partnerId?: string;
    partnerIds?: string[];
    platforms: PartnerContentPlatform[];
  };
}): Prisma.PartnerWhereInput {
  return {
    networkStatus: {
      in: ["approved", "trusted"],
    },
    ...(filter.partnerId && {
      id: filter.partnerId,
    }),
    ...(filter.partnerIds?.length && {
      id: {
        in: filter.partnerIds,
      },
    }),
    platforms: {
      some: buildEligiblePartnerPlatformWhere({
        mode,
        platforms: filter.platforms,
      }),
    },
  };
}
