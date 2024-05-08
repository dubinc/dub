export const intervals = [
  "1h",
  "24h",
  "7d",
  "30d",
  "90d",
  "1y",
  "all",
] as const;

export const INTERVALS = [
  {
    display: "Last hour",
    value: "1h",
  },
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
    display: "Last 12 months",
    value: "1y",
  },
  {
    display: "All Time",
    value: "all",
  },
];

export const intervalData = {
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

export const VALID_TINYBIRD_ENDPOINTS = [
  "clicks",
  "timeseries",
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referer",
  "top_links",
  "top_urls",
  // "top_aliases",
] as const;

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
