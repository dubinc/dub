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

// Application analytics
export const applicationEventAnalyticsQuerySchema = sharedFilterSchema.extend({
  event: z.enum(APPLICATION_EVENT_STAGES).optional(),
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
