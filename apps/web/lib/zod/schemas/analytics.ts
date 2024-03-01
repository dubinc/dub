import { intervals } from "@/lib/analytics";
import z from "@/lib/zod";
import { booleanQuerySchema } from ".";
import { COUNTRIES } from "@dub/utils";

const countryCodes = Object.keys(COUNTRIES) as [string, ...string[]];

export const getAnalyticsQuerySchema = z.object({
  projectSlug: z
    .string()
    .min(1, "Project slug is required.")
    .describe(
      "The slug for the project that the link belongs to. E.g. for `app.dub.co/acme`, the projectSlug is `acme`.",
    ),
  domain: z.string().optional().describe("The domain of the short link."),
  key: z.string().optional().describe("The short link slug."),
  interval: z
    .enum(intervals)
    .optional()
    .default("24h")
    .describe("The interval to retrieve analytics for."),
  country: z
    .enum(countryCodes)
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
  excludeRoot: booleanQuerySchema
    .optional()
    .default("false")
    .describe("Whether to exclude the root link from the response."),
});
