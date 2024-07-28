import z from "@/lib/zod";
import { COUNTRY_CODES } from "@dub/utils";

// Click analytics response schemas
export const clickAnalyticsResponse = {
  count: z
    .object({
      clicks: z.number().describe("The total number of clicks"),
    })
    .openapi({ ref: "ClicksCount", title: "ClicksCount" }),

  timeseries: z
    .object({
      start: z.string().describe("The starting timestamp of the interval"),
      clicks: z.number().describe("The number of clicks in the interval"),
    })
    .openapi({ ref: "ClicksTimeseries" }),

  // continents: z
  //   .object({
  //     continent: z
  //       .enum(CONTINENT_CODES)
  //       .describe(
  //         "The 2-letter ISO 3166-1 code representing the continent associated with the location of the user.",
  //       ),
  //     clicks: z.number().describe("The number of clicks from this continent"),
  //   })
  //   .openapi({ ref: "ClicksContinents" }),

  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe(
          "The 2-letter ISO 3166-1 country code for the country associated with the location of the user. Learn more: https://d.to/geo",
        ),
      clicks: z.number().describe("The number of clicks from this country"),
    })
    .openapi({ ref: "ClicksCountries" }),

  cities: z
    .object({
      city: z.string().describe("The name of the city"),
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the city: https://d.to/geo"),
      clicks: z.number().describe("The number of clicks from this city"),
    })
    .openapi({ ref: "ClicksCities" }),

  devices: z
    .object({
      device: z.string().describe("The name of the device"),
      clicks: z.number().describe("The number of clicks from this device"),
    })
    .openapi({ ref: "ClicksDevices" }),

  browsers: z
    .object({
      browser: z.string().describe("The name of the browser"),
      clicks: z.number().describe("The number of clicks from this browser"),
    })
    .openapi({ ref: "ClicksBrowsers" }),

  os: z
    .object({
      os: z.string().describe("The name of the OS"),
      clicks: z.number().describe("The number of clicks from this OS"),
    })
    .openapi({ ref: "ClicksOS" }),

  referers: z
    .object({
      referer: z
        .string()
        .describe(
          "The name of the referer. If unknown, this will be `(direct)`",
        ),
      clicks: z.number().describe("The number of clicks from this referer"),
    })
    .openapi({ ref: "ClicksReferers" }),

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
      clicks: z.number().describe("The number of clicks from this link"),
    })
    .openapi({ ref: "ClicksTopLinks" }),

  top_urls: z
    .object({
      url: z.string().describe("The destination URL"),
      clicks: z.number().describe("The number of clicks from this URL"),
    })
    .openapi({ ref: "ClicksTopUrls" }),

  trigger: z
    .object({
      trigger: z
        .enum(["link", "qr"])
        .describe("The type of trigger method: link click or QR scan"),
      clicks: z
        .number()
        .describe("The number of clicks from this trigger method."),
    })
    .openapi({ ref: "ClicksTrigger" }),
} as const;
