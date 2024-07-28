import { DUB_FOUNDING_DATE } from "@dub/utils";

export const intervals = [
  "24h",
  "7d",
  "30d",
  "90d",
  "ytd",
  "1y",
  "all",
  "all_unfiltered",
] as const;

export const INTERVAL_DISPLAYS = [
  {
    display: "Last 24 hours",
    value: "24h",
  },
  {
    display: "Last 7 days",
    value: "7d",
  },
  {
    display: "Last 30 days",
    value: "30d",
  },
  {
    display: "Last 3 months",
    value: "90d",
  },
  {
    display: "Year to Date",
    value: "ytd",
  },
  {
    display: "Last 12 months",
    value: "1y",
  },
  {
    display: "All Time",
    value: "all",
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
  ytd: {
    startDate: new Date(new Date().getFullYear(), 0, 1),
    granularity: "month",
  },
  "1y": {
    startDate: new Date(Date.now() - 31556952000),
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
  // "continents",
  "countries",
  "cities",
  "devices",
  "browsers",
  "os",
  "referers",
  "top_links",
  "top_urls",
  "trigger",
] as const;

export const SINGULAR_ANALYTICS_ENDPOINTS = {
  // continents: "continent",
  countries: "country",
  cities: "city",
  devices: "device",
  browsers: "browser",
  referers: "referer",
  os: "os",
};

export const VALID_ANALYTICS_FILTERS = [
  "domain",
  "key",
  "interval",
  "start",
  "end",
  "continent",
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referer",
  "url",
  "tagId",
  "qr",
  "root",
];

export const EVENT_TYPES = ["clicks", "leads", "sales", "composite"] as const;

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
  referer: "referers",
  top_links: "top_links",
  top_urls: "top_urls",
} as const;
