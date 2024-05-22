import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";

export const leadAnalyticsResponse = {
  count: z.object({
    leads: z.number().describe("The total number of leads"),
  }),

  timeseries: z.object({
    start: z.string().describe("The starting timestamp of the interval"),
    leads: z.number().describe("The number of leads in the interval"),
  }),

  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code: https://d.to/geo"),
      leads: z.number().describe("The number of leads from this country"),
    })
    .openapi({ ref: "leadsByCountry" }),

  cities: z
    .object({
      city: z.string().describe("The name of the city"),
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the city: https://d.to/geo"),
      leads: z.number().describe("The number of leads from this city"),
    })
    .openapi({ ref: "leadsByCities" }),

  devices: z.object({
    device: z.string().describe("The name of the device"),
    leads: z.number().describe("The number of leads from this device"),
  }),

  browsers: z.object({
    browser: z.string().describe("The name of the browser"),
    leads: z.number().describe("The number of leads from this browser"),
  }),

  os: z.object({
    os: z.string().describe("The name of the OS"),
    leads: z.number().describe("The number of leads from this OS"),
  }),

  referers: z.object({
    referer: z
      .string()
      .describe("The name of the referer. If unknown, this will be `(direct)`"),
    leads: z.number().describe("The number of leads from this referer"),
  }),

  top_links: z.object({
    link: z.string().describe("The unique ID of the short link"),
    leads: z.number().describe("The number of leads from this link"),
  }),

  top_urls: z.object({
    url: z.string().describe("The destination URL"),
    leads: z.number().describe("The number of leads from this URL"),
  }),
} as const;
