import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";

export const saleAnalyticsResponse = {
  count: z.object({
    sales: z.number().describe("The total number of sales"),
    amount: z.number().describe("The total amount of sales"),
  }),

  timeseries: z.object({
    start: z.string().describe("The starting timestamp of the interval"),
    sales: z.number().describe("The number of sales in the interval"),
    amount: z.number().describe("The total amount of sales in the interval"),
  }),

  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code: https://d.to/geo"),
      sales: z.number().describe("The number of sales from this country"),
      amount: z
        .number()
        .describe("The total amount of sales from this country"),
    })
    .openapi({ ref: "salesByCountry" }),

  cities: z
    .object({
      city: z.string().describe("The name of the city"),
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the city: https://d.to/geo"),
      sales: z.number().describe("The number of sales from this city"),
      amount: z.number().describe("The total amount of sales from this city"),
    })
    .openapi({ ref: "salesByCities" }),

  devices: z.object({
    device: z.string().describe("The name of the device"),
    sales: z.number().describe("The number of sales from this device"),
    amount: z.number().describe("The total amount of sales from this device"),
  }),

  browsers: z.object({
    browser: z.string().describe("The name of the browser"),
    sales: z.number().describe("The number of sales from this browser"),
    amount: z.number().describe("The total amount of sales from this browser"),
  }),

  os: z.object({
    os: z.string().describe("The name of the OS"),
    sales: z.number().describe("The number of sales from this OS"),
    amount: z.number().describe("The total amount of sales from this OS"),
  }),

  referers: z.object({
    referer: z
      .string()
      .describe("The name of the referer. If unknown, this will be `(direct)`"),
    sales: z.number().describe("The number of sales from this referer"),
    amount: z.number().describe("The total amount of sales from this referer"),
  }),

  top_links: z.object({
    link: z.string().describe("The unique ID of the short link"),
    sales: z.number().describe("The number of sales from this link"),
    amount: z.number().describe("The total amount of sales from this link"),
  }),

  top_urls: z.object({
    url: z.string().describe("The destination URL"),
    sales: z.number().describe("The number of sales from this URL"),
    amount: z.number().describe("The total amount of sales from this URL"),
  }),
} as const;
