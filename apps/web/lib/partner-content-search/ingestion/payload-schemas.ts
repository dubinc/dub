import * as z from "zod/v4";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import { PARTNER_CONTENT_SEARCH_PLATFORMS } from "../types";
import { PARTNER_CONTENT_ENUMERATE_PAGE_SIZE } from "./routes";

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
