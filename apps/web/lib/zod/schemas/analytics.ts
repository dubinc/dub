import { intervals, VALID_TINYBIRD_ENDPOINTS } from "@/lib/analytics";
import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";
import { booleanQuerySchema } from "./misc";

export const getAnalyticsQuerySchema = z.object({
  domain: z.string().optional().describe("The domain of the short link."),
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
    .describe("The interval to retrieve analytics for."),
  startDate: z
    .string()
    .datetime()
    .refine(
      (value) => {
        const inputDate = new Date(value);
        const foundingDate = new Date("2022-09-22T00:00:00.000Z"); // Dub.co founding date
        return inputDate >= foundingDate;
      },
      {
        message: "The start date cannot be earlier than September 22, 2022.",
      },
    )
    .optional()
    .describe("The start date and time when to retrieve analytics from."),
  endDate: z
    .string()
    .datetime()
    .refine(
      (value) => {
        const todaysDate = new Date();
        const inputDate = new Date(value);
        return inputDate <= todaysDate;
      },
      {
        message: "The end date cannot be in future.",
      },
    )
    .optional()
    .describe("The end date and time when to retrieve analytics from."),
  country: z
    .enum(COUNTRY_CODES)
    .optional()
    .describe("The country to retrieve analytics for."),
  city: z.string().optional().describe("The city to retrieve analytics for."),
  device: z
    .string()
    .optional()
    .describe("The device to retrieve analytics for."),
  browser: z
    .string()
    .optional()
    .describe("The browser to retrieve analytics for."),
  os: z.string().optional().describe("The OS to retrieve analytics for."),
  referer: z
    .string()
    .optional()
    .describe("The referer to retrieve analytics for."),
  url: z.string().optional().describe("The URL to retrieve analytics for."),
  tagId: z
    .string()
    .optional()
    .describe("The tag ID to retrieve analytics for."),
  qr: booleanQuerySchema
    .optional()
    .describe(
      "Filter for QR code scans. If true, filter for QR codes only. If false, filter for links only. If undefined, return both.",
    ),
  root: booleanQuerySchema
    .optional()
    .describe(
      "Filter for root domains. If true, filter for domains only. If false, filter for links only. If undefined, return both.",
    ),
});

export const getAnalyticsEdgeQuerySchema = getAnalyticsQuerySchema.required({
  domain: true,
});

export const analyticsEndpointSchema = z.object({
  endpoint: z.enum(VALID_TINYBIRD_ENDPOINTS, {
    errorMap: (_issue, _ctx) => {
      return {
        message: `Invalid endpoint. Valid endpoints are: ${VALID_TINYBIRD_ENDPOINTS.join(", ")}`,
      };
    },
  }),
});

// Analytics response schemas
export const analyticsResponseSchema = {
  timeseries: z.object({
    start: z.string().describe("The starting timestamp of the interval"),
    clicks: z.number().describe("The number of clicks in the interval"),
  }),

  country: z.object({
    country: z
      .enum(COUNTRY_CODES)
      .describe("The 2-letter country code: https://d.to/geo"),
    clicks: z.number().describe("The number of clicks from this country"),
  }),

  city: z.object({
    city: z.string().describe("The name of the city"),
    country: z
      .enum(COUNTRY_CODES)
      .describe("The 2-letter country code of the city: https://d.to/geo"),
    clicks: z.number().describe("The number of clicks from this city"),
  }),

  device: z.object({
    device: z.string().describe("The name of the device"),
    clicks: z.number().describe("The number of clicks from this device"),
  }),

  browser: z.object({
    browser: z.string().describe("The name of the browser"),
    clicks: z.number().describe("The number of clicks from this browser"),
  }),

  os: z.object({
    os: z.string().describe("The name of the OS"),
    clicks: z.number().describe("The number of clicks from this OS"),
  }),

  referer: z.object({
    referer: z
      .string()
      .describe("The name of the referer. If unknown, this will be `(direct)`"),
    clicks: z.number().describe("The number of clicks from this referer"),
  }),

  topLinks: z.object({
    link: z.string().describe("The unique ID of the short link"),
    clicks: z.number().describe("The number of clicks from this link"),
  }),

  topUrls: z.object({
    url: z.string().describe("The destination URL"),
    clicks: z.number().describe("The number of clicks from this URL"),
  }),
} as const;
