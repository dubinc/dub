import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { formatAnalyticsEndpoint } from "@/lib/analytics/utils";
import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";
import { analyticsQuerySchema } from "./analytics";

export const analyticsEndpointSchema = z.object({
  endpoint: z
    .enum(VALID_ANALYTICS_ENDPOINTS, {
      errorMap: (_issue, _ctx) => {
        return {
          message: `Invalid endpoint value. Valid endpoints are: ${VALID_ANALYTICS_ENDPOINTS.join(", ")}`,
        };
      },
    })
    .transform((v) => formatAnalyticsEndpoint(v, "plural"))
    .optional()
    .describe(
      "The field to group the analytics by. If undefined, returns the total click count.",
    ),
});

export const getClickAnalytics = analyticsQuerySchema
  .omit({
    groupBy: true,
    interval: true,
    externalId: true,
    key: true,
    start: true,
    end: true,
    root: true,
    qr: true,
  })
  .extend({
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
    root: z.boolean().optional(),
    qr: z.boolean().optional(),
    start: z.string(),
    end: z.string(),
    granularity: z.enum(["minute", "hour", "day", "month"]).optional(),
  });

// Analytics response schemas
export const getClickAnalyticsResponse = {
  count: z.object({
    clicks: z.number().describe("The total number of clicks"),
  }),
  timeseries: z.object({
    start: z.string().describe("The starting timestamp of the interval"),
    clicks: z.number().describe("The number of clicks in the interval"),
  }),
  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code: https://d.to/geo"),
      clicks: z.number().describe("The number of clicks from this country"),
    })
    .openapi({ ref: "clicksByCountry" }),
  cities: z
    .object({
      city: z.string().describe("The name of the city"),
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the city: https://d.to/geo"),
      clicks: z.number().describe("The number of clicks from this city"),
    })
    .openapi({ ref: "clicksByCities" }),
  devices: z.object({
    device: z.string().describe("The name of the device"),
    clicks: z.number().describe("The number of clicks from this device"),
  }),
  browsers: z.object({
    browser: z.string().describe("The name of the browser"),
    clicks: z.number().describe("The number of clicks from this browser"),
  }),
  os: z.object({
    os: z.string().describe("The name of the OS"),
    clicks: z.number().describe("The number of clicks from this OS"),
  }),
  referers: z.object({
    referer: z
      .string()
      .describe("The name of the referer. If unknown, this will be `(direct)`"),
    clicks: z.number().describe("The number of clicks from this referer"),
  }),
  top_links: z.object({
    link: z.string().describe("The unique ID of the short link"),
    clicks: z.number().describe("The number of clicks from this link"),
  }),
  top_urls: z.object({
    url: z.string().describe("The destination URL"),
    clicks: z.number().describe("The number of clicks from this URL"),
  }),
} as const;
