import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import "server-only";
import * as z from "zod/v4";
import {
  PARTNER_CONTENT_SEARCH_PLATFORMS,
  PartnerContentPlatform,
} from "../types";

// Partners per enumerate page (default 500). Override via env to exercise the
// self-continuation chain locally without seeding 500+ partners.
export const PARTNER_CONTENT_ENUMERATE_PAGE_SIZE = (() => {
  const raw = process.env.PARTNER_CONTENT_ENUMERATE_PAGE_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 500;
})();
export const PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS = 7;

export const PARTNER_CONTENT_EMBED_FLOW_CONTROL = {
  key: "partner-content-embed-voyage",
  parallelism: 20,
  rate: 600,
  period: "1m",
} as const;

export const PARTNER_CONTENT_SEARCH_ROUTES = {
  enumerate: "/api/cron/partner-content/enumerate",
  enumeratePage: "/api/cron/partner-content/enumerate/page",
  fetch: "/api/cron/partner-content/fetch",
  transcript: "/api/cron/partner-content/transcript",
  embed: "/api/cron/partner-content/embed",
} as const;

type PartnerContentSearchRoute =
  (typeof PARTNER_CONTENT_SEARCH_ROUTES)[keyof typeof PARTNER_CONTENT_SEARCH_ROUTES];

export const partnerContentIngestionModeSchema = z.enum([
  "incremental",
  "backfill",
]);

export type PartnerContentIngestionMode = z.infer<
  typeof partnerContentIngestionModeSchema
>;

export const partnerContentIngestionFilterSchema = z
  .object({
    partnerId: z.string().optional(),
    partnerIds: z.array(z.string()).max(500).optional(),
    platforms: z
      .array(z.enum(PARTNER_CONTENT_SEARCH_PLATFORMS))
      .min(1)
      .default([...PARTNER_CONTENT_SEARCH_PLATFORMS]),
    limitPartners: z.number().int().positive().max(100_000).optional(),
  })
  .prefault({})
  .refine((filter) => !(filter.partnerId && filter.partnerIds?.length), {
    message: "Use either partnerId or partnerIds, not both.",
  });

export const partnerContentEnumeratePayloadSchema = z.object({
  mode: partnerContentIngestionModeSchema,
  filter: partnerContentIngestionFilterSchema,
  runStamp: z.string().min(1),
  dryRun: z.boolean().default(false),
  // Cursor for self-continued enumeration; absent on the initial dispatch.
  startingAfter: z.string().optional(),
  // Partner budget carried across continuation hops; omitted = unbounded.
  remainingPartners: z.number().int().nonnegative().optional(),
});

export const partnerContentEnumeratePagePayloadSchema = z.object({
  mode: partnerContentIngestionModeSchema,
  filter: partnerContentIngestionFilterSchema,
  runStamp: z.string().min(1),
  dryRun: z.boolean().default(false),
  partnerIds: z
    .array(z.string())
    .min(1)
    .max(PARTNER_CONTENT_ENUMERATE_PAGE_SIZE),
});

export const partnerContentFetchPayloadSchema = z.object({
  mode: partnerContentIngestionModeSchema,
  runStamp: z.string().min(1),
  dryRun: z.boolean().default(false),
  forceTranscriptJobs: z.boolean().default(false),
  // Escape hatch for linked-but-unverified platforms; backfills stay verified-only.
  ignoreUnverified: z.boolean().default(false),
  partnerId: z.string().min(1),
  partnerPlatformId: z.string().min(1),
  platform: z.enum(PARTNER_CONTENT_SEARCH_PLATFORMS),
});

export const partnerContentTranscriptPayloadSchema = z.object({
  mode: partnerContentIngestionModeSchema,
  runStamp: z.string().min(1),
  dryRun: z.boolean().default(false),
  // Re-fetch even if already fetched. Off by default so QStash redelivery doesn't
  // re-burn ScrapeCreators credits.
  forceRefetch: z.boolean().default(false),
  partnerId: z.string().min(1),
  partnerPlatformId: z.string().min(1),
  partnerContentItemId: z.string().min(1),
  platform: z.enum(PARTNER_CONTENT_SEARCH_PLATFORMS),
});

export const partnerContentEmbedPayloadSchema = z
  .object({
    mode: partnerContentIngestionModeSchema,
    runStamp: z.string().min(1),
    partnerId: z.string().min(1),
    partnerPlatformId: z.string().min(1).optional(),
    partnerContentItemId: z.string().min(1).optional(),
    limitContentItems: z.number().int().positive().max(500).default(100),
    maxChunks: z.number().int().positive().max(128).default(96),
  })
  .refine(
    ({ partnerPlatformId, partnerContentItemId }) =>
      Boolean(partnerPlatformId) !== Boolean(partnerContentItemId),
    {
      message: "Use exactly one of partnerPlatformId or partnerContentItemId.",
    },
  );

export type PartnerContentEnumeratePayload = z.infer<
  typeof partnerContentEnumeratePayloadSchema
>;

export function createPartnerContentRunStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function getPartnerContentUrl(route: PartnerContentSearchRoute) {
  return `${APP_DOMAIN_WITH_NGROK}${route}`;
}

export function createPartnerContentDeduplicationId(
  ...parts: Array<string | number | undefined>
) {
  return parts
    .filter((part): part is string | number => part !== undefined)
    .map((part) => String(part).replace(/[^a-zA-Z0-9_-]/g, "-"))
    .join("-");
}

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

export function getIncrementalRefreshCutoff() {
  return new Date(
    Date.now() - PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS * 24 * 60 * 60 * 1000,
  );
}

// Shared platform-eligibility predicate (verified + incremental-recency rules),
// used by both the enumerate and enumerate/page routes.
export function buildEligiblePartnerPlatformWhere({
  mode,
  platforms,
}: {
  mode: PartnerContentIngestionMode;
  platforms: PartnerContentPlatform[];
}): Prisma.PartnerPlatformWhereInput {
  return {
    type: {
      in: platforms,
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
            lt: getIncrementalRefreshCutoff(),
          },
        },
      ],
    }),
  };
}

// Partner-level eligibility for the enumerate route — composes
// buildEligiblePartnerPlatformWhere; gates on approved/trusted status.
export function buildEligiblePartnerWhere({
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

// Parse a cron payload. A malformed body is permanent, so respond 400 (not a
// withCron 500 + alert). Returns the payload, or a Response to return directly.
export function parsePartnerContentCronPayload<T extends z.ZodTypeAny>(
  schema: T,
  rawBody: string,
): z.infer<T> | Response {
  try {
    return schema.parse(JSON.parse(rawBody)) as z.infer<T>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return logAndRespond(
      `[PartnerContentSearch] Ignoring invalid cron payload: ${message}`,
      { status: 400, logLevel: "warn" },
    );
  }
}
