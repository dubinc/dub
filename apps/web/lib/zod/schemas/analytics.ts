import { intervals } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";
import { booleanQuerySchema } from "./misc";
import { parseDateSchema } from "./utils";

// Query schema for `/api/analytics/(clicks|leads|sales)/[endpoint]`
export const analyticsQuerySchema = z.object({
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
      "The interval to retrieve analytics for. Takes precedence over start and end. If undefined, defaults to 24h.",
    ),
  start: parseDateSchema
    .refine(
      (value: Date) => {
        const foundingDate = new Date("2022-09-22T00:00:00.000Z"); // Dub.co founding date
        return value >= foundingDate;
      },
      {
        message: "The start date cannot be earlier than September 22, 2022.",
      },
    )
    .optional()
    .describe("The start date and time when to retrieve analytics from."),
  end: parseDateSchema
    .refine(
      (value: Date) => {
        const todaysDate = new Date();
        return value <= todaysDate;
      },
      {
        message: "The end date cannot be in future.",
      },
    )
    .optional()
    .describe(
      "The end date and time when to retrieve analytics from. If not provided, defaults to the current date.",
    ),
  country: z
    .enum(COUNTRY_CODES)
    .optional()
    .describe("The country to retrieve analytics for.")
    .openapi({ ref: "countryCode" }),
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
