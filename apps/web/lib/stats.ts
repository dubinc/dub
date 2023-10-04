import { conn } from "./planetscale";

export type IntervalProps = "1h" | "24h" | "7d" | "30d" | "90d" | "all";

export const INTERVALS = [
  {
    display: "Last hour",
    slug: "1h",
  },
  {
    display: "Last 24 hours",
    slug: "24h",
  },
  {
    display: "Last 7 days",
    slug: "7d",
  },
  {
    display: "Last 30 days",
    slug: "30d",
  },
  {
    display: "Last 3 months",
    slug: "90d",
  },
  {
    display: "All Time",
    slug: "all",
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

export type DeviceTabs = "device" | "browser" | "os" | "bot" | "ua";

export const uaToBot = (ua: string): string => {
  if (!ua) return "Unknown Bot";
  if (ua.includes("curl")) {
    return "Curl Request";
  } else if (ua.includes("Slackbot")) {
    return "Slack Bot";
  } else if (ua.includes("Twitterbot")) {
    return "Twitter Bot";
  } else if (ua.includes("facebookexternalhit")) {
    return "Facebook Bot";
  } else if (ua.includes("LinkedInBot")) {
    return "LinkedIn Bot";
  } else if (ua.includes("WhatsApp")) {
    return "WhatsApp Bot";
  } else if (ua.includes("TelegramBot")) {
    return "Telegram Bot";
  } else if (ua.includes("Discordbot")) {
    return "Discord Bot";
  } else if (ua.includes("Googlebot")) {
    return "Google Bot";
  } else if (ua.includes("Baiduspider")) {
    return "Baidu Bot";
  } else if (ua.includes("bingbot")) {
    return "Bing Bot";
  } else if (ua.includes("YandexBot")) {
    return "Yandex Bot";
  } else if (ua.includes("DuckDuckBot")) {
    return "DuckDuckGo Bot";
  } else {
    return "Unknown Bot";
  }
};

const VALID_TINYBIRD_ENDPOINTS = new Set([
  "timeseries",
  "clicks",
  "country",
  "city",
  "device",
  "browser",
  "os",
  "bot",
  "referer",
]);

export const getStats = async ({
  domain,
  key,
  endpoint,
  interval,
}: {
  domain: string;
  key: string;
  endpoint: string;
  interval?: string | null;
}) => {
  // Note: we're using decodeURIComponent in this function because that's how we store it in MySQL and Tinybird

  if (
    !conn ||
    !process.env.TINYBIRD_API_KEY ||
    !VALID_TINYBIRD_ENDPOINTS.has(endpoint)
  ) {
    return [];
  }

  // get all-time clicks count if:
  // 1. endpoint is /clicks
  // 2. key is not _root
  // 3. interval is not defined
  // 4. there's a connection to MySQL
  if (endpoint === "clicks" && key !== "_root" && !interval && conn) {
    const response = await conn.execute(
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
  url.searchParams.append("key", decodeURIComponent(key));

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
