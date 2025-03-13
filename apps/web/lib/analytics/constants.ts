import { DUB_FOUNDING_DATE } from "@dub/utils";

export const intervals = [
  "24h",
  "7d",
  "30d",
  "90d",
  "1y",
  "mtd",
  "qtd",
  "ytd",
  "all",
] as const;

export const eventIntervals = [
  "24h",
  "7d",
  "30d",
  "90d",
  "1y",
  "mtd",
  "qtd",
  "ytd",
  "all",
] as const;

export const DUB_LINKS_ANALYTICS_INTERVAL = "24h";
export const DUB_PARTNERS_ANALYTICS_INTERVAL = "30d";

export const INTERVAL_DISPLAYS = [
  {
    display: "Last 24 hours",
    value: "24h",
    shortcut: "d",
  },
  {
    display: "Last 7 days",
    value: "7d",
    shortcut: "w",
  },
  {
    display: "Last 30 days",
    value: "30d",
    shortcut: "t",
  },
  {
    display: "Last 3 months",
    value: "90d",
    shortcut: "3",
  },
  {
    display: "Last 12 months",
    value: "1y",
    shortcut: "l",
  },
  {
    display: "Month to Date",
    value: "mtd",
    shortcut: "m",
  },
  {
    display: "Quarter to Date",
    value: "qtd",
    shortcut: "q",
  },
  {
    display: "Year to Date",
    value: "ytd",
    shortcut: "y",
  },
  {
    display: "All Time",
    value: "all",
    shortcut: "a",
  },
];

export const INTERVAL_DATA: Record<
  string,
  {
    startDate: Date;
    granularity: "minute" | "hour" | "day" | "month";
  }
> = {
  "24h": {
    startDate: new Date(Date.now() - 86400000),
    granularity: "hour",
  },
  "7d": {
    startDate: new Date(Date.now() - 604800000),
    granularity: "day",
  },
  "30d": {
    startDate: new Date(Date.now() - 2592000000),
    granularity: "day",
  },
  "90d": {
    startDate: new Date(Date.now() - 7776000000),
    granularity: "day",
  },
  "1y": {
    startDate: new Date(Date.now() - 31556952000),
    granularity: "month",
  },
  mtd: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    granularity: "day",
  },
  qtd: {
    startDate: new Date(
      new Date().getFullYear(),
      Math.floor(new Date().getMonth() / 3) * 3,
      1,
    ),
    granularity: "day",
  },
  ytd: {
    startDate: new Date(new Date().getFullYear(), 0, 1),
    granularity: "month",
  },
  all: {
    // Dub.co founding date
    startDate: DUB_FOUNDING_DATE,
    granularity: "month",
  },
};

export const VALID_ANALYTICS_ENDPOINTS = [
  "count",
  "timeseries",
  "continents",
  "regions",
  "countries",
  "cities",
  "devices",
  "browsers",
  "os",
  "trigger", // deprecated, but keeping for now for backwards compatibility
  "triggers",
  "referers",
  "referer_urls",
  "top_links",
  "top_urls",
  "utm_sources",
  "utm_mediums",
  "utm_campaigns",
  "utm_terms",
  "utm_contents",
] as const;

export const SINGULAR_ANALYTICS_ENDPOINTS = {
  continents: "continent",
  regions: "region",
  countries: "country",
  cities: "city",
  devices: "device",
  browsers: "browser",
  referers: "referer",
  referer_urls: "refererUrl",
  os: "os",
  triggers: "trigger",
  utm_sources: "utm_source",
  utm_mediums: "utm_medium",
  utm_campaigns: "utm_campaign",
  utm_terms: "utm_term",
  utm_contents: "utm_content",
};

export const VALID_ANALYTICS_FILTERS = [
  "domain",
  "key",
  "interval",
  "start",
  "end",
  "country",
  "city",
  "region",
  "continent",
  "device",
  "browser",
  "os",
  "trigger",
  "referer",
  "refererUrl",
  "url",
  "tagId",
  "folderId",
  "tagIds",
  "qr", // deprecated, but keeping for now for backwards compatibility
  "root",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

// possible analytics filters for a given linkId
export const DIMENSIONAL_ANALYTICS_FILTERS = [
  "country",
  "city",
  "region",
  "continent",
  "device",
  "browser",
  "os",
  "trigger",
  "referer",
  "refererUrl",
  "url",
  "qr", // deprecated, but keeping for now for backwards compatibility
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

export const TRIGGER_DISPLAY = {
  qr: "QR Scan",
  link: "Link Click",
};
export const TRIGGER_TYPES = ["qr", "link"] as const;

export const EVENT_TYPES = ["clicks", "leads", "sales"] as const;

export const ANALYTICS_VIEWS = ["timeseries", "funnel"] as const;
export const ANALYTICS_SALE_UNIT = ["sales", "saleAmount"] as const;

export const OLD_ANALYTICS_ENDPOINTS = [
  "clicks",
  "count",
  "timeseries",
  "countries",
  "country",
  "cities",
  "city",
  "devices",
  "device",
  "browsers",
  "browser",
  "os",
  "triggers",
  "trigger",
  "referers",
  "referer",
  "top_links",
  "top_urls",
] as const;

export const OLD_TO_NEW_ANALYTICS_ENDPOINTS = {
  clicks: "count",
  timeseries: "timeseries",
  country: "countries",
  city: "cities",
  device: "devices",
  browser: "browsers",
  os: "os",
  trigger: "triggers",
  referer: "referers",
  top_links: "top_links",
  top_urls: "top_urls",
} as const;
