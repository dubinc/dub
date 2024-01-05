import { conn } from "./planetscale";

export type IntervalProps = "1h" | "24h" | "7d" | "30d" | "90d" | "all";

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
    granularity: "month",
  },
  all: {
    // Dub.co founding date
    startDate: new Date("2022-09-22"),
    granularity: "month",
  },
};

export type LocationTabs = "country" | "city" | "region";

export type DeviceTabs = "device" | "browser" | "os" | "ua";

const VALID_TINYBIRD_ENDPOINTS = [
  "timeseries",
  "clicks",
  "top_links",
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referer",
];

export const VALID_STATS_FILTERS = [
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referer",
];

export const getStats = async ({
  domain,
  key,
  endpoint,
  interval,
  ...rest
}: {
  domain: string;
  key?: string;
  endpoint: string;
  interval?: string;
} & {
  [key in typeof VALID_STATS_FILTERS[number]]: string;
}) => {
  // Note: we're using decodeURIComponent in this function because that's how we store it in MySQL and Tinybird

  if (
    !process.env.DATABASE_URL ||
    !process.env.TINYBIRD_API_KEY ||
    !VALID_TINYBIRD_ENDPOINTS.includes(endpoint)
  ) {
    return [];
  }

  // get all-time clicks count if:
  // 1. endpoint is /clicks
  // 2. interval is not defined
  if (endpoint === "clicks" && key && !interval) {
    const response =
      key === "_root"
        ? await conn.execute("SELECT clicks FROM Domain WHERE slug = ?", [
            domain,
          ])
        : await conn.execute(
            "SELECT clicks FROM Link WHERE domain = ? AND `key` = ?",
            [domain, decodeURIComponent(key)],
          );
    try {
      const clicks = response.rows[0]["clicks"];
      return clicks || "0";
    } catch (e) {
      console.log(e, "Potential reason: Link is not in MySQL DB");
    }
  }

  let url = new URL(
    `https://api.us-east.tinybird.co/v0/pipes/${endpoint}.json`,
  );
  url.searchParams.append("domain", domain);
  if (key) {
    url.searchParams.append("key", decodeURIComponent(key));
  }
  if (interval) {
    url.searchParams.append(
      "start",
      intervalData[interval].startDate
        .toISOString()
        .replace("T", " ")
        .replace("Z", ""),
    );
    url.searchParams.append(
      "end",
      new Date(Date.now()).toISOString().replace("T", " ").replace("Z", ""),
    );

    url.searchParams.append("granularity", intervalData[interval].granularity);
  }

  VALID_STATS_FILTERS.forEach((filter) => {
    if (rest[filter]) {
      url.searchParams.append(filter, rest[filter]);
    }
  });

  return await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
    },
  })
    .then((res) => res.json())
    .then(({ data }) => {
      if (endpoint === "clicks") {
        try {
          const clicks = data[0]["count()"];
          return clicks || "0";
        } catch (e) {
          console.log(e);
        }
      }
      return data;
    });
};
