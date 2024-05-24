export const intervals = [
  "1h",
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
  "1h": {
    startDate: new Date(Date.now() - 3600000),
    granularity: "minute",
  },
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
    startDate: new Date("2022-09-22"),
    granularity: "month",
  },
};

export const VALID_ANALYTICS_ENDPOINTS = [
  "count",
  "timeseries",
  "countries",
  "cities",
  "devices",
  "browsers",
  "os",
  "referers",
  "top_links",
  "top_urls",
] as const;

export const SINGULAR_ANALYTICS_ENDPOINTS = {
  countries: "country",
  cities: "city",
  devices: "device",
  browsers: "browser",
  referers: "referer",
};

export const VALID_ANALYTICS_FILTERS = [
  "country",
  "city",
  "url",
  "alias",
  "device",
  "browser",
  "os",
  "referer",
  "tagId",
  "qr",
  "root",
];
