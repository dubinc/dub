import {
  DATE_RANGE_INTERVAL_PRESETS,
  EVENT_TYPES,
  OLD_ANALYTICS_ENDPOINTS,
  OLD_TO_NEW_ANALYTICS_ENDPOINTS,
  TRIGGER_TYPES,
  VALID_ANALYTICS_ENDPOINTS,
} from "@/lib/analytics/constants";
import { prefixWorkspaceId } from "@/lib/api/workspace-id";
import z from "@/lib/zod";
import {
  CONTINENT_CODES,
  COUNTRY_CODES,
  PAGINATION_LIMIT,
  THE_BEGINNING_OF_TIME,
  capitalize,
  formatDate,
} from "@dub/utils";
import { booleanQuerySchema } from "./misc";
import { parseDateSchema } from "./utils";
import { utmTagsSchema } from "./utm";

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
    "The parameter to group the analytics data points by. Defaults to `count` if undefined.",
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

// Query schema for GET /analytics and GET /events endpoints
export const analyticsQuerySchema = z
  .object({
    event: analyticsEvents,
    groupBy: analyticsGroupBy,
    domain: z
      .string()
      .optional()
      .describe("The domain to filter analytics for."),
    key: z
      .string()
      .optional()
      .describe(
        "The slug of the short link to retrieve analytics for. Must be used along with the corresponding `domain` of the short link to fetch analytics for a specific short link.",
      ),
    linkId: z
      .string()
      .optional()
      .describe(
        "The unique ID of the short link on Dub to retrieve analytics for.",
      ),
    externalId: z
      .string()
      .optional()
      .describe(
        "The ID of the link in the your database. Must be prefixed with 'ext_' when passed as a query parameter.",
      ),
    tenantId: z
      .string()
      .optional()
      .describe(
        "The ID of the tenant that created the link inside your system.",
      ),
    programId: z
      .string()
      .optional()
      .describe("The ID of the program to retrieve analytics for."),
    partnerId: z
      .string()
      .optional()
      .describe("The ID of the partner to retrieve analytics for."),
    customerId: z
      .string()
      .optional()
      .describe("The ID of the customer to retrieve analytics for."),
    interval: z
      .enum(DATE_RANGE_INTERVAL_PRESETS)
      .optional()
      .describe(
        "The interval to retrieve analytics for. If undefined, defaults to 24h.",
      ),
    start: parseDateSchema
      .refine((value: Date) => value >= THE_BEGINNING_OF_TIME, {
        message: `The start date cannot be earlier than ${formatDate(THE_BEGINNING_OF_TIME)}.`,
      })
      .optional()
      .describe(
        "The start date and time when to retrieve analytics from. If set, takes precedence over `interval`.",
      ),
    end: parseDateSchema
      .optional()
      .describe(
        "The end date and time when to retrieve analytics from. If not provided, defaults to the current date. If set along with `start`, takes precedence over `interval`.",
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
      .describe(
        "The country to retrieve analytics for. Must be passed as a 2-letter ISO 3166-1 country code. Learn more: https://d.to/geo",
      )
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
    folderId: z
      .string()
      .optional()
      .describe(
        "The folder ID to retrieve analytics for. If not provided, return analytics for unsorted links.",
      ),
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
  })
  .merge(utmTagsSchema);

// Analytics filter params for Tinybird endpoints
export const analyticsFilterTB = z
  .object({
    eventType: analyticsEvents,
    workspaceId: z
      .string()
      .optional()
      .transform((v) => (v ? prefixWorkspaceId(v) : undefined)),
    customerId: z.string().optional(),
    root: z.boolean().optional(),
    qr: z.boolean().optional(),
    start: z.string(),
    end: z.string(),
    granularity: z.enum(["minute", "hour", "day", "month"]).optional(),
    timezone: z.string().optional(),
    groupByUtmTag: z
      .string()
      .optional()
      .describe("The UTM tag to group by. Defaults to `utm_source`."),
    folderIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("The folder IDs to retrieve analytics for."),
    isMegaFolder: z.boolean().optional(),
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
      utm_source: true,
      utm_medium: true,
      utm_campaign: true,
      utm_term: true,
      utm_content: true,
      programId: true,
      partnerId: true,
      tenantId: true,
      folderId: true,
      sortBy: true,
    }),
  );

export const eventsFilterTB = analyticsFilterTB
  .omit({ granularity: true, timezone: true, page: true, sortBy: true })
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
  .omit({ groupBy: true, sortBy: true })
  .extend({
    event: z
      .enum(EVENT_TYPES)
      .default("clicks")
      .describe(
        "The type of event to retrieve analytics for. Defaults to 'clicks'.",
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
