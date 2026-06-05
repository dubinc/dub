import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { PARTNER_CONTENT_SEARCH_PLATFORMS } from "../types";

// Partners enumerated per page / per page-worker job. Defaults to 500; override
// with the PARTNER_CONTENT_ENUMERATE_PAGE_SIZE env var (e.g. 3) to exercise the
// self-continuation chain locally without seeding 500+ eligible partners.
export const PARTNER_CONTENT_ENUMERATE_PAGE_SIZE = (() => {
  const raw = process.env.PARTNER_CONTENT_ENUMERATE_PAGE_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 500;
})();
export const PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS = 7;

export const PARTNER_CONTENT_SEARCH_ROUTES = {
  enumerate: "/api/cron/partner-content/enumerate",
  enumeratePage: "/api/cron/partner-content/enumerate/page",
  fetch: "/api/cron/partner-content/fetch",
} as const;

type PartnerContentSearchRoute =
  (typeof PARTNER_CONTENT_SEARCH_ROUTES)[keyof typeof PARTNER_CONTENT_SEARCH_ROUTES];

export const partnerContentIngestionModeSchema = z.enum([
  "incremental",
  "backfill",
]);

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
  .default({})
  .refine((filter) => !(filter.partnerId && filter.partnerIds?.length), {
    message: "Use either partnerId or partnerIds, not both.",
  });

export const partnerContentEnumeratePayloadSchema = z.object({
  mode: partnerContentIngestionModeSchema,
  filter: partnerContentIngestionFilterSchema,
  runStamp: z.string().min(1),
  dryRun: z.boolean().default(false),
  // Cursor handed back to this same route for self-continued enumeration;
  // absent on the initial dispatch from the admin trigger.
  startingAfter: z.string().optional(),
  // Remaining partner budget carried across continuation hops. Seeded from
  // filter.limitPartners on the first hop; omitted means unbounded.
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
  partnerId: z.string().min(1),
  partnerPlatformId: z.string().min(1),
  platform: z.enum(PARTNER_CONTENT_SEARCH_PLATFORMS),
});

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
