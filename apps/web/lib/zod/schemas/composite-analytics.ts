import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";

export const compositeAnalyticsResponse = {
  count: z.object({
    clicks: z.number().describe("The total number of clicks"),
    leads: z.number().describe("The total number of leads"),
    sales: z.number().describe("The total number of sales"),
    amount: z.number().describe("The total amount of sales"),
  }),

  timeseries: z.object({
    start: z.string().describe("The starting timestamp of the interval"),
    clicks: z.number().describe("The number of clicks in the interval"),
    leads: z.number().describe("The number of leads in the interval"),
    sales: z.number().describe("The number of sales in the interval"),
    amount: z.number().describe("The total amount of sales in the interval"),
  }),

  // continents: z.object({
  //   continent: z
  //     .enum(CONTINENT_CODES)
  //     .describe(
  //       "The 2-letter ISO 3166-1 code representing the continent associated with the location of the user.",
  //     ),
  //   clicks: z.number().describe("The number of clicks from this continent"),
  //   leads: z.number().describe("The number of leads from this continent"),
  //   sales: z.number().describe("The number of sales from this continent"),
  //   amount: z
  //     .number()
  //     .describe("The total amount of sales from this continent"),
  // }),

  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe(
          "The 2-letter ISO 3166-1 country code for the country associated with the location of the user. Learn more: https://d.to/geo",
        ),
      clicks: z.number().describe("The number of clicks from this country"),
      leads: z.number().describe("The number of leads from this country"),
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
      clicks: z.number().describe("The number of clicks from this city"),
      leads: z.number().describe("The number of leads from this city"),
      sales: z.number().describe("The number of sales from this city"),
      amount: z.number().describe("The total amount of sales from this city"),
    })
    .openapi({ ref: "salesByCities" }),

  devices: z.object({
    device: z.string().describe("The name of the device"),
    clicks: z.number().describe("The number of clicks from this device"),
    leads: z.number().describe("The number of leads from this device"),
    sales: z.number().describe("The number of sales from this device"),
    amount: z.number().describe("The total amount of sales from this device"),
  }),

  browsers: z.object({
    browser: z.string().describe("The name of the browser"),
    clicks: z.number().describe("The number of clicks from this browser"),
    leads: z.number().describe("The number of leads from this browser"),
    sales: z.number().describe("The number of sales from this browser"),
    amount: z.number().describe("The total amount of sales from this browser"),
  }),

  os: z.object({
    os: z.string().describe("The name of the OS"),
    clicks: z.number().describe("The number of clicks from this OS"),
    leads: z.number().describe("The number of leads from this OS"),
    sales: z.number().describe("The number of sales from this OS"),
    amount: z.number().describe("The total amount of sales from this OS"),
  }),

  referers: z.object({
    referer: z
      .string()
      .describe("The name of the referer. If unknown, this will be `(direct)`"),
    clicks: z.number().describe("The number of clicks from this referer"),
    leads: z.number().describe("The number of leads from this referer"),
    sales: z.number().describe("The number of sales from this referer"),
    amount: z.number().describe("The total amount of sales from this referer"),
  }),

  top_links: z.object({
    link: z
      .string()
      .describe("The unique ID of the short link")
      .openapi({ deprecated: true }),
    id: z.string().describe("The unique ID of the short link"),
    domain: z.string().describe("The domain of the short link"),
    key: z.string().describe("The key of the short link"),
    shortLink: z.string().describe("The short link URL"),
    url: z.string().describe("The destination URL of the short link"),
    createdAt: z.string().describe("The creation timestamp of the short link"),
    clicks: z.number().describe("The number of clicks from this link"),
    leads: z.number().describe("The number of leads from this link"),
    sales: z.number().describe("The number of sales from this link"),
    amount: z.number().describe("The total amount of sales from this link"),
  }),

  top_urls: z.object({
    url: z.string().describe("The destination URL"),
    clicks: z.number().describe("The number of clicks from this URL"),
    leads: z.number().describe("The number of leads from this URL"),
    sales: z.number().describe("The number of sales from this URL"),
    amount: z.number().describe("The total amount of sales from this URL"),
  }),

  trigger: z.object({
    trigger: z
      .enum(["link", "qr"])
      .describe("The type of trigger method: link click or QR scan"),
    clicks: z
      .number()
      .describe("The number of clicks from this trigger method."),
    leads: z.number().describe("The number of leads from this trigger method."),
    sales: z.number().describe("The number of sales from this trigger method."),
    amount: z
      .number()
      .describe("The total amount of sales from this trigger method."),
  }),
} as const;
