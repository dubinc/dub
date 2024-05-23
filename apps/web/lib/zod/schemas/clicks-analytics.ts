import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";

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
