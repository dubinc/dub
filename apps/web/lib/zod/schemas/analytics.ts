import {
  EVENT_TYPES,
  OLD_ANALYTICS_ENDPOINTS,
  OLD_TO_NEW_ANALYTICS_ENDPOINTS,
  TRIGGER_TYPES,
  VALID_ANALYTICS_ENDPOINTS,
  eventIntervals,
  intervals,
} from "@/lib/analytics/constants";
import z from "@/lib/zod";
import {
  CONTINENT_CODES,
  COUNTRY_CODES,
  DUB_FOUNDING_DATE,
  PAGINATION_LIMIT,
  capitalize,
  formatDate,
} from "@dub/utils";
import { booleanQuerySchema } from "./misc";
import { parseDateSchema } from "./utils";

const analyticsEvents = z
  .enum([...EVENT_TYPES, "composite"], {
    errorMap: (_issue, _ctx) => {
      return {
        message:
          "Invalid event type. Valid event types are: clicks, leads, sales",
      };
    },
  })
  .default("clicks")
  .describe(
    "The type of event to retrieve analytics for. Defaults to `clicks`.",
  );

const analyticsGroupBy = z
  .enum(VALID_ANALYTICS_ENDPOINTS, {
    errorMap: (_issue, _ctx) => {
      return {
        message: `Invalid type value. Valid values are: ${VALID_ANALYTICS_ENDPOINTS.filter((v) => v !== "trigger").join(", ")}.`,
      };
    },
  })
  .default("count")
  .describe(
    "The parameter to group the analytics data points by. Defaults to `count` if undefined. Note that `trigger` is deprecated (use `triggers` instead), but kept for backwards compatibility.",
  );

const oldAnalyticsEndpoints = z
  .enum(OLD_ANALYTICS_ENDPOINTS, {
    errorMap: (_issue, _ctx) => {
      return {
        message: `Invalid type value. Valid values are: ${OLD_ANALYTICS_ENDPOINTS.join(", ")}`,
      };
    },
  })
  .transform((v) => OLD_TO_NEW_ANALYTICS_ENDPOINTS[v] || v);

// For backwards compatibility
export const analyticsPathParamsSchema = z.object({
  eventType: analyticsEvents
    .removeDefault()
    .or(oldAnalyticsEndpoints)
    .optional(),
  endpoint: oldAnalyticsEndpoints.optional(),
});

// Query schema for /api/analytics endpoint
export const analyticsQuerySchema = z.object({
  event: analyticsEvents,
  groupBy: analyticsGroupBy,
  domain: z.string().optional().describe("The domain to filter analytics for."),
  key: z.string().optional().describe("The short link slug."),
  linkId: z
    .string()
    .optional()
    .describe("The unique ID of the short link on Dub."),
  externalId: z
    .string()
    .optional()
    .describe(
      "This is the ID of the link in the your database. Must be prefixed with 'ext_' when passed as a query parameter.",
    ),
  interval: z
    .enum(intervals)
    .optional()
    .describe(
      "The interval to retrieve analytics for. If undefined, defaults to 24h.",
    ),
  start: parseDateSchema
    .refine((value: Date) => value >= DUB_FOUNDING_DATE, {
      message: `The start date cannot be earlier than ${formatDate(DUB_FOUNDING_DATE)}.`,
    })
    .optional()
    .describe(
      "The start date and time when to retrieve analytics from. Takes precedence over `interval`.",
    ),
  end: parseDateSchema
    .optional()
    .describe(
      "The end date and time when to retrieve analytics from. If not provided, defaults to the current date. Takes precedence over `interval`.",
    ),
  timezone: z
    .string()
    .optional()
    .describe(
      "The IANA time zone code for aligning timeseries granularity (e.g. America/New_York). Defaults to UTC.",
    )
    .openapi({ example: "America/New_York", default: "UTC" }),
  country: z
    .enum(COUNTRY_CODES)
    .optional()
    .describe("The country to retrieve analytics for.")
    .openapi({ ref: "countryCode" }),
  city: z
    .string()
    .optional()
    .describe("The city to retrieve analytics for.")
    .openapi({ example: "New York" }),
  region: z
    .string()
    .optional()
    .describe("The ISO 3166-2 region code to retrieve analytics for.")
    .openapi({ ref: "regionCode" }),
  continent: z
    .enum(CONTINENT_CODES)
    .optional()
    .describe("The continent to retrieve analytics for.")
    .openapi({ ref: "continentCode" }),
  device: z
    .string()
    .optional()
    .transform((v) => capitalize(v) as string | undefined)
    .describe("The device to retrieve analytics for.")
    .openapi({ example: "Desktop" }),
  browser: z
    .string()
    .optional()
    .transform((v) => capitalize(v) as string | undefined)
    .describe("The browser to retrieve analytics for.")
    .openapi({ example: "Chrome" }),
  os: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "iOS") return "iOS";
      return capitalize(v) as string | undefined;
    })
    .describe("The OS to retrieve analytics for.")
    .openapi({ example: "Windows" }),
  trigger: z
    .enum(TRIGGER_TYPES)
    .optional()
    .describe(
      "The trigger to retrieve analytics for. If undefined, return both QR and link clicks.",
    ),
  referer: z
    .string()
    .optional()
    .describe("The referer to retrieve analytics for.")
    .openapi({ example: "google.com" }),
  refererUrl: z
    .string()
    .optional()
    .describe("The full referer URL to retrieve analytics for.")
    .openapi({ example: "https://dub.co/blog" }),
  url: z.string().optional().describe("The URL to retrieve analytics for."),
  tagId: z
    .string()
    .optional()
    .describe(
      "Deprecated. Use `tagIds` instead. The tag ID to retrieve analytics for.",
    )
    .openapi({ deprecated: true }),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The tag IDs to retrieve analytics for."),
  qr: booleanQuerySchema
    .optional()
    .describe(
      "Deprecated. Use the `trigger` field instead. Filter for QR code scans. If true, filter for QR codes only. If false, filter for links only. If undefined, return both.",
    )
    .openapi({ deprecated: true }),
  root: booleanQuerySchema
    .optional()
    .describe(
      "Filter for root domains. If true, filter for domains only. If false, filter for links only. If undefined, return both.",
    ),
});

// Analytics filter params for Tinybird endpoints
export const analyticsFilterTB = z
  .object({
    eventType: analyticsEvents,
    workspaceId: z
      .string()
      .optional()
      .transform((v) => {
        if (v && !v.startsWith("ws_")) {
          return `ws_${v}`;
        } else {
          return v;
        }
      }),
    programId: z.string().optional(),
    customerId: z.string().optional(),
    root: z.boolean().optional(),
    qr: z.boolean().optional(),
    start: z.string(),
    end: z.string(),
    granularity: z.enum(["minute", "hour", "day", "month"]).optional(),
    timezone: z.string().optional(),
  })
  .merge(
    analyticsQuerySchema.pick({
      browser: true,
      city: true,
      country: true,
      continent: true,
      region: true,
      device: true,
      domain: true,
      linkId: true,
      os: true,
      referer: true,
      refererUrl: true,
      tagIds: true,
      url: true,
    }),
  );

export const eventsFilterTB = analyticsFilterTB
  .omit({ granularity: true, timezone: true, page: true })
  .and(
    z.object({
      offset: z.coerce.number().default(0),
      limit: z.coerce.number().default(PAGINATION_LIMIT),
      order: z.enum(["asc", "desc"]).default("desc"),
      sortBy: z.enum(["timestamp"]).default("timestamp"),
    }),
  );

const sortOrder = z
  .enum(["asc", "desc"])
  .default("desc")
  .optional()
  .describe("The sort order. The default is `desc`.");

export const eventsQuerySchema = analyticsQuerySchema
  .omit({ groupBy: true })
  .extend({
    event: z
      .enum(EVENT_TYPES)
      .default("clicks")
      .describe(
        "The type of event to retrieve analytics for. Defaults to 'clicks'.",
      ),
    interval: z
      .enum(eventIntervals)
      .default("24h")
      .describe(
        "The interval to retrieve events for. Takes precedence over start and end. If undefined, defaults to 24h.",
      ),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(PAGINATION_LIMIT),
    sortOrder,
    sortBy: z
      .enum(["timestamp"])
      .optional()
      .default("timestamp")
      .describe("The field to sort the events by. The default is `timestamp`."),
    order: sortOrder
      .describe("DEPRECATED. Use `sortOrder` instead.")
      .openapi({ deprecated: true }),
  });
