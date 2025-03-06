import { TRIGGER_TYPES } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { CONTINENT_CODES, COUNTRY_CODES } from "@dub/utils";

const analyticsTriggersResponse = z
  .object({
    trigger: z
      .enum(TRIGGER_TYPES)
      .describe("The type of trigger method: link click or QR scan"),
    clicks: z
      .number()
      .describe("The number of clicks from this trigger method")
      .default(0),
    leads: z
      .number()
      .describe("The number of leads from this trigger method")
      .default(0),
    sales: z
      .number()
      .describe("The number of sales from this trigger method")
      .default(0),
    saleAmount: z
      .number()
      .describe("The total amount of sales from this trigger method, in cents")
      .default(0),
  })
  .openapi({ ref: "AnalyticsTriggers" });

export const analyticsResponse = {
  count: z
    .object({
      clicks: z.number().describe("The total number of clicks").default(0),
      leads: z.number().describe("The total number of leads").default(0),
      sales: z.number().describe("The total number of sales").default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsCount", title: "AnalyticsCount" }),
  timeseries: z
    .object({
      start: z.string().describe("The starting timestamp of the interval"),
      clicks: z
        .number()
        .describe("The number of clicks in the interval")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads in the interval")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales in the interval")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales in the interval, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsTimeseries" }),

  continents: z
    .object({
      continent: z
        .enum(CONTINENT_CODES)
        .describe(
          "The 2-letter ISO 3166-1 code representing the continent associated with the location of the user.",
        ),
      clicks: z
        .number()
        .describe("The number of clicks from this continent")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this continent")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this continent")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this continent, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsContinents" }),

  countries: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe(
          "The 2-letter ISO 3166-1 country code for the country associated with the location of the user. Learn more: https://d.to/geo",
        ),
      region: z.literal("*").default("*"),
      city: z.literal("*").default("*"),
      clicks: z
        .number()
        .describe("The number of clicks from this country")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this country")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this country")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this country, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsCountries" }),

  regions: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the region: https://d.to/geo"),
      region: z
        .string()
        .describe(
          "The 2-letter ISO 3166-2 region code representing the region associated with the location of the user.",
        ),
      city: z.literal("*").default("*"),
      clicks: z
        .number()
        .describe("The number of clicks from this region")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this region")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this region")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this region, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsRegions" }),

  cities: z
    .object({
      country: z
        .enum(COUNTRY_CODES)
        .describe("The 2-letter country code of the city: https://d.to/geo"),
      region: z.literal("*").default("*"),
      city: z.string().describe("The name of the city"),
      clicks: z
        .number()
        .describe("The number of clicks from this city")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this city")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this city")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this city, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsCities" }),

  devices: z
    .object({
      device: z.string().describe("The name of the device"),
      clicks: z
        .number()
        .describe("The number of clicks from this device")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this device")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this device")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this device, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsDevices" }),

  browsers: z
    .object({
      browser: z.string().describe("The name of the browser"),
      clicks: z
        .number()
        .describe("The number of clicks from this browser")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this browser")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this browser")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this browser, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsBrowsers" }),

  os: z
    .object({
      os: z.string().describe("The name of the OS"),
      clicks: z
        .number()
        .describe("The number of clicks from this OS")
        .default(0),
      leads: z.number().describe("The number of leads from this OS").default(0),
      sales: z.number().describe("The number of sales from this OS").default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this OS, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsOS" }),

  triggers: analyticsTriggersResponse,
  trigger: analyticsTriggersResponse, // backwards compatibility

  referers: z
    .object({
      referer: z
        .string()
        .describe(
          "The name of the referer. If unknown, this will be `(direct)`",
        ),
      clicks: z
        .number()
        .describe("The number of clicks from this referer")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this referer")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this referer")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this referer, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsReferers" }),

  referer_urls: z
    .object({
      refererUrl: z
        .string()
        .describe(
          "The full URL of the referer. If unknown, this will be `(direct)`",
        ),
      clicks: z
        .number()
        .describe("The number of clicks from this referer to this URL")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this referer to this URL")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this referer to this URL")
        .default(0),
      saleAmount: z
        .number()
        .describe(
          "The total amount of sales from this referer to this URL, in cents",
        )
        .default(0),
    })
    .openapi({ ref: "AnalyticsRefererUrls" }),

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
      comments: z.string().nullish().describe("The comments of the short link"),
      createdAt: z
        .string()
        .describe("The creation timestamp of the short link"),
      clicks: z
        .number()
        .describe("The number of clicks from this link")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this link")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this link")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this link, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsTopLinks" }),

  top_urls: z
    .object({
      url: z.string().describe("The destination URL"),
      clicks: z
        .number()
        .describe("The number of clicks from this URL")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads from this URL")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales from this URL")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales from this URL, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsTopUrls" }),

  utm_sources: z
    .object({
      utm_source: z.string().describe("The UTM source"),
      clicks: z
        .number()
        .describe("The number of clicks with this UTM source")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads with this UTM source")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales with this UTM source")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales with this UTM source, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsUTMSources" }),

  utm_mediums: z
    .object({
      utm_medium: z.string().describe("The UTM medium"),
      clicks: z
        .number()
        .describe("The number of clicks with this UTM medium")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads with this UTM medium")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales with this UTM medium")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales with this UTM medium, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsUTMMediums" }),

  utm_campaigns: z
    .object({
      utm_campaign: z.string().describe("The UTM campaign"),
      clicks: z
        .number()
        .describe("The number of clicks with this UTM campaign")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads with this UTM campaign")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales with this UTM campaign")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales with this UTM campaign, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsUTMCampaigns" }),

  utm_terms: z
    .object({
      utm_term: z.string().describe("The UTM term"),
      clicks: z
        .number()
        .describe("The number of clicks with this UTM term")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads with this UTM term")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales with this UTM term")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales with this UTM term, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsUTMTerms" }),

  utm_contents: z
    .object({
      utm_content: z.string().describe("The UTM content"),
      clicks: z
        .number()
        .describe("The number of clicks with this UTM content")
        .default(0),
      leads: z
        .number()
        .describe("The number of leads with this UTM content")
        .default(0),
      sales: z
        .number()
        .describe("The number of sales with this UTM content")
        .default(0),
      saleAmount: z
        .number()
        .describe("The total amount of sales with this UTM content, in cents")
        .default(0),
    })
    .openapi({ ref: "AnalyticsUTMContents" }),
} as const;
