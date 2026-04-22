import { GroupSchema } from "@/lib/zod/schemas/groups";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { COUNTRY_CODES } from "@dub/utils";
import * as z from "zod/v4";

export const trackApplicationEventBodySchema = z.object({
  eventName: z.enum(["visit", "start"]),
  url: z.url(),
  referrer: z.string().nullish(),
});

export const APPLICATION_ID_COOKIE_PREFIX = "dub_app_evt_id_";

export const APPLICATION_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const APPLICATION_EVENT_TYPES = [
  "visited",
  "started",
  "submitted",
  "approved",
  "rejected",
] as const;

export const APPLICATION_ANALYTICS_GROUP_BY = [
  "count",
  "country",
  "referralSource",
] as const;

export const applicationEventsFilterSchema = z.object({
  groupId: z.string().optional(),
  partnerId: z.string().optional(),
  country: z.enum(COUNTRY_CODES).optional(),
  referralSource: z.string().optional(),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});

export const applicationEventsQuerySchema =
  applicationEventsFilterSchema.extend({
    event: z.enum(APPLICATION_EVENT_TYPES).optional(),
    page: z.coerce.number().default(1),
    pageSize: z.coerce.number().max(100).default(50),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z
      .enum([
        "visitedAt",
        "startedAt",
        "submittedAt",
        "approvedAt",
        "rejectedAt",
      ])
      .default("visitedAt"),
  });

export const applicationAnalyticsQuerySchema =
  applicationEventsFilterSchema.extend({
    groupBy: z.enum(APPLICATION_ANALYTICS_GROUP_BY).default("count"),
  });

export const applicationEventSchema = z.object({
  id: z.string(),
  country: z.string().nullable(),
  referralSource: z.string(),
  referredByPartnerId: z.string().nullable(),
  visitedAt: z.date().nullable(),
  startedAt: z.date().nullable(),
  submittedAt: z.date().nullable(),
  approvedAt: z.date().nullable(),
  rejectedAt: z.date().nullable(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
  group: GroupSchema.pick({
    id: true,
    name: true,
    slug: true,
    color: true,
  }).nullable(),
});

// TODO:
// Improve this schema

const funnelCountsSchema = z.object({
  visits: z.number(),
  starts: z.number(),
  submissions: z.number(),
  approvals: z.number(),
  rejections: z.number(),
});

export const applicationAnalyticsSchema = z.union([
  funnelCountsSchema,
  z.array(
    funnelCountsSchema.extend({
      country: z.string().nullable().optional(),
      referralSource: z.string().optional(),
    }),
  ),
]);
