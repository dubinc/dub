import { GroupSchema } from "@/lib/zod/schemas/groups";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import { analyticsQuerySchema } from "../zod/schemas/analytics";

export const APPLICATION_ID_COOKIE_PREFIX = "dub_app_evt_id_";

export const APPLICATION_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const APPLICATION_EVENT_STAGES = [
  "visited",
  "started",
  "submitted",
  "approved",
] as const;

export const trackApplicationEventSchema = z.object({
  eventName: z.enum(["visit", "start"]),
  url: z.url(),
  referrer: z.string().nullish(),
});

const sharedFilterSchema = analyticsQuerySchema
  .pick({
    start: true,
    end: true,
    interval: true,
    timezone: true,
  })
  .extend({
    partnerId: z.string().optional(),
    referralSource: z.string().optional(),
    country: z.string().optional(),
  });

// Application events
export const applicationEventsQuerySchema = sharedFilterSchema.extend({
  event: z
    .enum(["visited", "started", "submitted", "approved", "rejected"])
    .optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  sortBy: z
    .enum(["visitedAt", "startedAt", "submittedAt", "approvedAt", "rejectedAt"])
    .default("visitedAt"),
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

// Application analytics
export const applicationEventAnalyticsQuerySchema = sharedFilterSchema.extend({
  groupBy: z
    .enum(["count", "timeseries", "partnerId", "referralSource", "country"])
    .default("count"),
});

const metricsSchema = z.object({
  visits: z.number(),
  starts: z.number(),
  submissions: z.number(),
  approvals: z.number(),
  rejections: z.number(),
});

export const applicationEventAnalyticsSchema = {
  count: metricsSchema,

  timeseries: metricsSchema.extend({
    start: z.string(),
  }),

  partnerId: metricsSchema.extend({
    partner: PartnerSchema.pick({
      id: true,
      name: true,
      image: true,
      email: true,
    }),
  }),

  referralSource: metricsSchema.extend({
    referralSource: z.string(),
  }),

  country: metricsSchema.extend({
    country: z.string(),
  }),
};
