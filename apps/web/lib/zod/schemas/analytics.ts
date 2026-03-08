import {
  DATE_RANGE_INTERVAL_PRESETS,
  EVENT_TYPES,
  OLD_ANALYTICS_ENDPOINTS,
  OLD_TO_NEW_ANALYTICS_ENDPOINTS,
  VALID_ANALYTICS_ENDPOINTS,
} from "@/lib/analytics/constants";
import {
  DEFAULT_PAGINATION_LIMIT,
  DUB_FOUNDING_DATE,
  capitalize,
  formatDate,
  parseFilterValue,
} from "@dub/utils";
import * as z from "zod/v4";
import { booleanQuerySchema } from "./misc";
import { parseDateSchema } from "./utils";

const analyticsEvents = z
  .enum([...EVENT_TYPES, "composite"], {
    error: "Invalid event type. Valid event types are: clicks, leads, sales",
  })
  .default("clicks")
  .meta({
    description:
      "The type of event to retrieve analytics for. Defaults to `clicks`.",
    example: "leads",
  });

const analyticsGroupBy = z
  .enum(VALID_ANALYTICS_ENDPOINTS, {
    error: `Invalid type value. Valid values are: ${VALID_ANALYTICS_ENDPOINTS.filter((v) => v !== "trigger").join(", ")}.`,
  })
  .default("count")
  .describe(
    "The parameter to group the analytics data points by. Defaults to `count` if undefined.",
  );

const oldAnalyticsEndpoints = z
  .enum(OLD_ANALYTICS_ENDPOINTS, {
    error: `Invalid type value. Valid values are: ${OLD_ANALYTICS_ENDPOINTS.join(", ")}`,
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
export const analyticsQuerySchema = z.object({
  event: analyticsEvents,
  groupBy: analyticsGroupBy,
  domain: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The domain to filter analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `dub.co`, `dub.co,google.com`, `-spam.com`.",
    )
    .meta({ example: "dub.co" }),
  key: z
    .string()
    .optional()
    .describe(
      "The slug of the short link to retrieve analytics for. Must be used along with the corresponding `domain` of the short link to fetch analytics for a specific short link.",
    ),
  linkId: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The unique ID of the link to retrieve analytics for." +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `link_123`, `link_123,link_456`, `-link_789`.",
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
    .transform(parseFilterValue)
    .describe(
      "The ID of the tenant that created the link inside your system. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `tenant_123`, `tenant_123,tenant_456`, `-tenant_789`.",
    ),
  tagId: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The tag ID to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `tag_123`, `tag_123,tag_456`, `-tag_789`.",
    ),
  folderId: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The folder ID to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `folder_123`, `folder_123,folder_456`, `-folder_789`. " +
        "If not provided, return analytics for all links.",
    ),
  groupId: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The group ID to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `grp_123`, `grp_123,grp_456`, `-grp_789`.",
    ),
  partnerId: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The ID of the partner to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `pn_123`, `pn_123,pn_456`, `-pn_789`.",
    ),
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
    .refine((value: Date) => value >= DUB_FOUNDING_DATE, {
      message: `The start date cannot be earlier than ${formatDate(DUB_FOUNDING_DATE)}.`,
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
    .meta({ example: "America/New_York", default: "UTC" }),
  // more filter facets
  country: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The country to retrieve analytics for. Must be passed as a 2-letter ISO 3166-1 country code (see https://d.to/geo). " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `US`, `US,BR,FR`, `-US`.",
    ),
  city: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The city to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `New York`, `New York,London`, `-New York`.",
    ),
  region: z
    .string()
    .optional()
    .describe(
      "The ISO 3166-2 region code to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `NY`, `NY,CA`, `-NY`.",
    ),
  continent: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The continent to retrieve analytics for. Valid values: AF, AN, AS, EU, NA, OC, SA. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `NA`, `NA,EU`, `-AS`.",
    ),
  device: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      // Capitalize each value
      const parsed = parseFilterValue(v);
      if (!parsed) return undefined;
      return {
        ...parsed,
        values: parsed.values
          .map((val) => capitalize(val))
          .filter(Boolean) as string[],
      };
    })
    .describe(
      "The device to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `Desktop`, `Mobile,Tablet`, `-Mobile`.",
    ),
  browser: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const parsed = parseFilterValue(v);
      if (!parsed) return undefined;
      return {
        ...parsed,
        values: parsed.values
          .map((val) => capitalize(val))
          .filter(Boolean) as string[],
      };
    })
    .describe(
      "The browser to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `Chrome`, `Chrome,Firefox,Safari`, `-IE`.",
    ),
  os: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const parsed = parseFilterValue(v);
      if (!parsed) return undefined;
      return {
        ...parsed,
        values: parsed.values
          .map((val) => (val === "iOS" ? "iOS" : capitalize(val)))
          .filter(Boolean) as string[],
      };
    })
    .describe(
      "The OS to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `Windows`, `Mac,Windows,Linux`, `-Windows`.",
    ),
  trigger: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The trigger to retrieve analytics for. Valid values: qr, link, pageview. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `qr`, `qr,link`, `-qr`. " +
        "If undefined, returns all trigger types.",
    ),
  referer: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The referer hostname to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `google.com`, `google.com,twitter.com`, `-facebook.com`.",
    ),
  refererUrl: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The full referer URL to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `https://google.com`, `https://google.com,https://twitter.com`, `-https://spam.com`.",
    ),
  url: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The destination URL to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `https://example.com`, `https://example.com,https://other.com`, `-https://spam.com`.",
    ),
  utm_source: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The UTM source to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `google`, `google,twitter`, `-spam`.",
    ),
  utm_medium: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The UTM medium to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `cpc`, `cpc,social`, `-email`.",
    ),
  utm_campaign: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The UTM campaign to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
        "Examples: `summer_sale`, `summer_sale,winter_sale`, `-old_campaign`.",
    ),
  utm_term: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The UTM term to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`).",
    ),
  utm_content: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "The UTM content to retrieve analytics for. " +
        "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`).",
    ),
  root: booleanQuerySchema
    .optional()
    .describe(
      "Filter for root domains. If true, filter for domains only. If false, filter for links only. If undefined, return both.",
    ),
  saleType: z
    .enum(["new", "recurring"])
    .optional()
    .describe(
      "Filter sales by type: 'new' for first-time purchases, 'recurring' for repeat purchases. If undefined, returns both.",
    ),
  query: z
    .string()
    .max(10000)
    .optional()
    .describe(
      "Search the events by a custom metadata value. Only available for lead and sale events. " +
        "Examples: `metadata['key']:'value'`",
    ),
  // deprecated fields
  programId: z
    .string()
    .optional()
    .describe(
      "Deprecated: This is automatically inferred from your workspace's defaultProgramId. The ID of the program to retrieve analytics for.",
    )
    .meta({ deprecated: true }),
  tagIds: z
    .string()
    .optional()
    .transform(parseFilterValue)
    .describe(
      "Deprecated: Use `tagId` instead. The tag IDs to retrieve analytics for.",
    )
    .meta({ deprecated: true }),
  qr: booleanQuerySchema
    .optional()
    .describe(
      "Deprecated: Use the `trigger` field instead. Filter for QR code scans. If true, filter for QR codes only. If false, filter for links only. If undefined, return both.",
    )
    .meta({ deprecated: true }),
});

/**
 * Parse analytics/events query parameters with backward compatibility
 * Converts deprecated multiple value fields (tagIds) to singular fields (tagId)
 */
export function parseAnalyticsQuery(searchParams: Record<string, string>) {
  const data = analyticsQuerySchema.parse(searchParams);

  if (data.tagIds && !data.tagId) {
    data.tagId = data.tagIds;
  }

  return data;
}
export function parseEventsQuery(searchParams: Record<string, string>) {
  const data = eventsQuerySchema.parse(searchParams);

  if (data.tagIds && !data.tagId) {
    data.tagId = data.tagIds;
  }

  return data;
}

// Analytics filter params for Tinybird endpoints
export const analyticsFilterTB = z.object({
  eventType: analyticsEvents,
  workspaceId: z.string().optional(),
  groupBy: analyticsGroupBy,
  domain: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe("The domain(s) to retrieve analytics for."),
  domainOperator: z.enum(["IN", "NOT IN"]).optional(),
  linkId: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The link IDs to retrieve analytics for (with operator support).",
    ),
  linkIdOperator: z.enum(["IN", "NOT IN"]).optional(),
  tenantId: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The tenant ID(s) to retrieve analytics for (with operator support).",
    ),
  tenantIdOperator: z.enum(["IN", "NOT IN"]).optional(),
  tagId: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The tag ID(s) to retrieve analytics for (with operator support).",
    ),
  tagIdOperator: z.enum(["IN", "NOT IN"]).optional(),
  folderId: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The folder ID(s) to retrieve analytics for (with operator support).",
    ),
  folderIdOperator: z.enum(["IN", "NOT IN"]).optional(),
  groupId: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The group ID(s) to retrieve analytics for (with operator support).",
    ),
  groupIdOperator: z.enum(["IN", "NOT IN"]).optional(),
  partnerId: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .optional()
    .describe(
      "The partner ID(s) to retrieve analytics for (with operator support).",
    ),
  partnerIdOperator: z.enum(["IN", "NOT IN"]).optional(),
  customerId: z.string().optional(),
  start: z.string(),
  end: z.string(),
  granularity: z.enum(["minute", "hour", "day", "month"]).optional(),
  timezone: z.string().optional(),
  // Region is a special case - it's the subdivision part of a region code
  region: z.string().optional(),
  root: z
    .union([z.string(), z.boolean()])
    .transform((v) => {
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1" || v === "yes";
    })
    .optional()
    .describe(
      "Filter for root domain links. True = root only, false = links only. Single value (no operator).",
    ),
  programId: z.string().optional(),
  saleType: z
    .enum(["new", "recurring"])
    .optional()
    .describe(
      "Filter sales by type: 'new' or 'recurring'. Single value only (no operator).",
    ),
  // All dimensional filters now go through the JSON filters parameter
  filters: z
    .string()
    .optional()
    .describe("JSON array of advanced filters with operators (IN, NOT IN)."),
});

export const eventsFilterTB = analyticsFilterTB
  .omit({ granularity: true, timezone: true })
  .and(
    z.object({
      offset: z.coerce.number().default(0),
      limit: z.coerce.number().default(DEFAULT_PAGINATION_LIMIT),
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
    page: z.coerce.number().default(1),
    limit: z.coerce
      .number()
      .max(1000, { message: "Max pagination limit is 1000 items per page." })
      .default(DEFAULT_PAGINATION_LIMIT),
    sortOrder,
    sortBy: z
      .enum(["timestamp"])
      .optional()
      .default("timestamp")
      .describe("The field to sort the events by. The default is `timestamp`."),
    order: sortOrder
      .describe("DEPRECATED. Use `sortOrder` instead.")
      .meta({ deprecated: true }),
  });
