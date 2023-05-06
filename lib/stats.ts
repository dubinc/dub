import { conn } from "./planetscale";

export type IntervalProps = "1h" | "24h" | "7d" | "30d" | "90d";

export const intervalData = {
  "1h": {
    milliseconds: 3600000,
    interval: 60000,
    granularity: "minute",
    format: (e: number) =>
      new Date(e).toLocaleTimeString("en-us", {
        hour: "numeric",
        minute: "numeric",
      }),
  },
  "24h": {
    milliseconds: 86400000,
    interval: 3600000,
    granularity: "hour",
    format: (e: number) =>
      new Date(e)
        .toLocaleDateString("en-us", {
          month: "short",
          day: "numeric",
          hour: "numeric",
        })
        .replace(",", " "),
  },
  "7d": {
    milliseconds: 604800000,
    interval: 86400000,
    granularity: "day",
    format: (e: number) =>
      new Date(e).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      }),
  },
  "30d": {
    milliseconds: 2592000000,
    interval: 86400000,
    granularity: "day",
    format: (e: number) =>
      new Date(e).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      }),
  },
  "90d": {
    milliseconds: 7776000000,
    interval: 86400000,
    granularity: "day",
    format: (e: number) =>
      new Date(e).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      }),
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
  if (!process.env.TINYBIRD_API_KEY) {
    return null;
  }

  if (!VALID_TINYBIRD_ENDPOINTS.has(endpoint)) {
    return null;
  }

  // get all-time clicks count if:
  // 1. endpoint is /clicks
  // 2. key is not _root
  // 3. interval is not defined
  // 4. there's a connection to MySQL
  if (endpoint === "clicks" && key !== "_root" && !interval && conn) {
    const response = await conn.execute(
      "SELECT clicks FROM Link WHERE domain = ? AND `key` = ?",
      [domain, key],
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
  url.searchParams.append("key", key);
  if (interval) {
    url.searchParams.append(
      "start",
      new Date(Date.now() - intervalData[interval].milliseconds)
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

  return await fetch(url, {
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
