import { NextRequest } from "next/server";
import { COUNTRIES } from "@/lib/constants";

export interface RawStatsProps {
  geo: NextRequest["geo"];
  ua: any;
  referer: string;
  timestamp: number;
}

export interface StatsProps {
  key: string;
  interval: IntervalProps;
  totalClicks: number;
  clicksData: { start: number; end: number; count: number }[];
  locationData: {
    country: string;
    countryCode: string;
    city: string;
    region: string;
  }[];
  deviceData: { device: string; browser: string; os: string; bot: string }[];
}

export type IntervalProps = "1h" | "24h" | "7d" | "30d";

export const intervalData = {
  "1h": {
    milliseconds: 3600000,
    intervals: 60,
    coefficient: 60000,
    format: (e: number) =>
      new Date(e).toLocaleTimeString("en-us", {
        hour: "numeric",
        minute: "numeric",
      }),
  },
  "24h": {
    milliseconds: 86400000,
    intervals: 24,
    coefficient: 3600000,
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
    intervals: 7,
    coefficient: 86400000,
    format: (e: number) =>
      new Date(e).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      }),
  },
  "30d": {
    milliseconds: 2592000000,
    intervals: 30,
    coefficient: 86400000,
    format: (e: number) =>
      new Date(e).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      }),
  },
};

interface getTimeIntervalsOutputProps {
  startTimestamp: number;
  endTimestamp: number;
  timeIntervals: { start: number; end: number }[];
}

export const getTimeIntervals = (
  interval: IntervalProps
): getTimeIntervalsOutputProps => {
  const { milliseconds, intervals, coefficient } = intervalData[interval];
  const endTimestamp = Math.ceil(Date.now() / coefficient) * coefficient;
  const startTimestamp = endTimestamp - milliseconds;
  const timeIntervals = Array.from({ length: intervals }, (_, i) => ({
    start: startTimestamp + i * coefficient,
    end: startTimestamp + (i + 1) * coefficient,
  }));
  return { startTimestamp, endTimestamp, timeIntervals };
};

export function processData(
  key: string,
  data: RawStatsProps[],
  interval?: IntervalProps // if undefined, 24h is used
): StatsProps {
  const { timeIntervals } = getTimeIntervals(interval || "24h");

  const clicksData = timeIntervals.map((interval) => ({
    ...interval,
    count: data.filter(
      (d) => d.timestamp > interval.start && d.timestamp < interval.end
    ).length,
  }));

  const locationData = data.map(({ geo }) => {
    const { country: countryCode, city, region } = geo || {};
    const country = countryCode
      ? COUNTRIES[countryCode]
        ? COUNTRIES[countryCode]
        : countryCode
      : "Unknown";
    return {
      country,
      countryCode: countryCode || "Unknown",
      city: city || country,
      region: region || country,
    };
  });

  const deviceData = data.map(({ ua }) => {
    const { ua: uaString, device, browser, os } = ua || {};
    return {
      device: device?.type
        ? device?.type
        : handleDeviceEdgeCases(uaString) !== "Unknown"
        ? "Bot"
        : "Desktop", // placeholder for now, after https://github.com/faisalman/ua-parser-js/issues/489 is fixed we can change this back to Unknown
      browser: browser?.name
        ? browser?.name
        : handleDeviceEdgeCases(uaString) !== "Unknown"
        ? "Bot"
        : "Unknown",
      os: os?.name
        ? os?.name
        : handleDeviceEdgeCases(uaString) !== "Unknown"
        ? "Bot"
        : "Unknown",
      bot: handleDeviceEdgeCases(uaString),
    };
  });

  return {
    key,
    interval: interval || "24h",
    totalClicks: data.length,
    clicksData,
    locationData,
    deviceData,
  };
}

export interface LocationStatsProps {
  display: string;
  code: string;
  count: number;
}

export type LocationTabs = "country" | "city" | "region";

export const processLocationData = (
  data: StatsProps["locationData"],
  tab: LocationTabs
): LocationStatsProps[] => {
  const countryCodeMap: { [key: string]: string } = {};

  const results =
    data && data.length > 0
      ? data.reduce<Record<string, number>>((acc, d) => {
          const count = acc[d[tab]] || 0;
          acc[d[tab]] = count + 1;
          countryCodeMap[d[tab]] = d.countryCode;
          return acc;
        }, {})
      : {};

  return Object.entries(results)
    .map(([item, count]) => ({
      display: item,
      code: countryCodeMap[item],
      count,
    }))
    .sort((a, b) => b.count - a.count);
};

export type DeviceTabs = "device" | "browser" | "os" | "bot";

export interface DeviceStatsProps {
  display: string;
  count: number;
}

export const processDeviceData = (
  data: StatsProps["deviceData"],
  tab: DeviceTabs,
  showBots: boolean
): DeviceStatsProps[] => {
  const results =
    data && data.length > 0
      ? data.reduce<Record<string, number>>((acc, d) => {
          const currentVal = d[tab];
          const count = acc[currentVal] || 0;
          // for the bots tab, we only want to show bots
          if (tab === "bot") {
            if (currentVal !== "Unknown") {
              acc[currentVal] = count + 1;
            }
            // for all other tabs, we only show bots if showBots is true
          } else {
            if (currentVal !== "Bot" || (currentVal === "Bot" && showBots)) {
              acc[currentVal] = count + 1;
            }
          }
          return acc;
        }, {})
      : {};

  return Object.entries(results)
    .map(([display, count]) => ({
      display,
      count,
    }))
    .sort((a, b) => b.count - a.count);
};

export const dummyData: StatsProps = {
  key: "test",
  interval: "24h",
  totalClicks: 0,
  clicksData: getTimeIntervals("24h").timeIntervals.map((interval) => ({
    ...interval,
    count: 0,
  })),
  // @ts-ignore
  locationData: null,
  // @ts-ignore
  deviceData: null,
};

export const handleDeviceEdgeCases = (ua: string): string => {
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
    return "Unknown";
  }
};
