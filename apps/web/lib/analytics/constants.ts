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

export const eventIntervals = [
  "24h",
  "7d",
  "30d",
  "90d",
  "ytd",
  "1y",
  "all",
] as const;

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
    shortcut: "m",
  },
  {
    display: "Last 3 months",
    value: "90d",
    shortcut: "t",
  },
  {
    display: "Year to Date",
    value: "ytd",
    shortcut: "y",
  },
  {
    display: "Last 12 months",
    value: "1y",
    shortcut: "l",
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
  "continents",
  "countries",
  "cities",
  "devices",
  "browsers",
  "os",
  "triggers",
  "referers",
  "referer_urls",
  "top_links",
  "top_urls",
] as const;

export const SINGULAR_ANALYTICS_ENDPOINTS = {
  continents: "continent",
  countries: "country",
  cities: "city",
  devices: "device",
  browsers: "browser",
  referers: "referer",
  referer_urls: "refererUrl",
  os: "os",
  triggers: "trigger",
};

export const TRIGGER_DISPLAY = {
  qr: "QR Scan",
  link: "Link Click",
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
  "trigger",
  "referer",
  "refererUrl",
  "url",
  "tagId",
  "qr",
  "root",
];

export const TRIGGER_TYPES = ["qr", "link"] as const;
export const EVENT_TYPES = ["clicks", "leads", "sales"] as const;

export const ANALYTICS_VIEWS = ["default", "funnel"] as const;

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
