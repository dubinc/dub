import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";

export const saleAnalyticsResponse = {
  count: z
    .object({
      sales: z.number().describe("The total number of sales"),
      amount: z.number().describe("The total amount of sales"),
    })
    .openapi({ ref: "SalesCount", title: "SalesCount" }),

  timeseries: z
    .object({
      start: z.string().describe("The starting timestamp of the interval"),
      sales: z.number().describe("The number of sales in the interval"),
      amount: z.number().describe("The total amount of sales in the interval"),
    })
    .openapi({ ref: "SalesTimeseries" }),

  // continents: z
  //   .object({
  //     continent: z
  //       .enum(CONTINENT_CODES)
  //       .describe(
  //         "The 2-letter ISO 3166-1 code representing the continent associated with the location of the user.",
  //       ),
  //     sales: z.number().describe("The number of sales from this continent"),
  //   })
  //   .openapi({ ref: "SalesContinents" }),

  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe(
          "The 2-letter ISO 3166-1 country code for the country associated with the location of the user. Learn more: https://d.to/geo",
        ),
      sales: z.number().describe("The number of sales from this country"),
      amount: z
        .number()
        .describe("The total amount of sales from this country"),
    })
    .openapi({ ref: "SalesCountries" }),

  cities: z
    .object({
      city: z.string().describe("The name of the city"),
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the city: https://d.to/geo"),
      sales: z.number().describe("The number of sales from this city"),
      amount: z.number().describe("The total amount of sales from this city"),
    })
    .openapi({ ref: "SalesCities" }),

  devices: z
    .object({
      device: z.string().describe("The name of the device"),
      sales: z.number().describe("The number of sales from this device"),
      amount: z.number().describe("The total amount of sales from this device"),
    })
    .openapi({ ref: "SalesDevices" }),

  browsers: z
    .object({
      browser: z.string().describe("The name of the browser"),
      sales: z.number().describe("The number of sales from this browser"),
      amount: z
        .number()
        .describe("The total amount of sales from this browser"),
    })
    .openapi({ ref: "SalesBrowsers" }),

  os: z
    .object({
      os: z.string().describe("The name of the OS"),
      sales: z.number().describe("The number of sales from this OS"),
      amount: z.number().describe("The total amount of sales from this OS"),
    })
    .openapi({ ref: "SalesOS" }),

  referers: z
    .object({
      referer: z
        .string()
        .describe(
          "The name of the referer. If unknown, this will be `(direct)`",
        ),
      sales: z.number().describe("The number of sales from this referer"),
      amount: z
        .number()
        .describe("The total amount of sales from this referer"),
    })
    .openapi({ ref: "SalesReferers" }),

  top_links: z
    .object({
      link: z
        .string()
        .describe("The unique ID of the short link")
        .openapi({ deprecated: true }),
      id: z.string().describe("The unique ID of the short link"),
      domain: z.string().describe("The domain of the short link"),
      key: z.string().describe("The key of the short link"),
      shortLink: z.string().describe("The short link URL"),
      url: z.string().describe("The destination URL of the short link"),
      createdAt: z
        .string()
        .describe("The creation timestamp of the short link"),
      sales: z.number().describe("The number of sales from this link"),
      amount: z.number().describe("The total amount of sales from this link"),
    })
    .openapi({ ref: "SalesTopLinks" }),

  top_urls: z
    .object({
      url: z.string().describe("The destination URL"),
      sales: z.number().describe("The number of sales from this URL"),
      amount: z.number().describe("The total amount of sales from this URL"),
    })
    .openapi({ ref: "SalesTopUrls" }),

  trigger: z
    .object({
      trigger: z
        .enum(["link", "qr"])
        .describe("The type of trigger method: link click or QR scan"),
      sales: z
        .number()
        .describe("The number of sales from this trigger method."),
      amount: z
        .number()
        .describe("The total amount of sales from this trigger method."),
    })
    .openapi({ ref: "SalesTrigger" }),
} as const;
