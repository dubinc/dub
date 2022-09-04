import { NextRequest } from "next/server";
import { COUNTRIES } from "@/lib/constants";

export interface RawStatsProps {
  geo: NextRequest["geo"];
  ua: any;
  timestamp: number;
}

export interface StatsProps {
  key: string;
  totalClicks: number;
  clicksData: { start: number; end: number; count: number }[];
  locationData: {
    country: string;
    countryCode: string;
    city: string;
    region: string;
  }[];
  browserData: { browser: string; count: number }[];
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
  interval?: IntervalProps // if undefined, 7d is used
): StatsProps {
  const { timeIntervals } = getTimeIntervals(interval || "7d");

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

  const browserData =
    data.length > 0
      ? data.reduce((acc, d) => {
          const browser = d.ua?.browser?.name;
          // @ts-ignore
          const count = acc[browser] || 0;
          // @ts-ignore
          acc[browser] = count + 1;
          return acc;
        }, {})
      : {};

  const browserDataArray = Object.entries(browserData).map(
    ([browser, count]) => ({
      browser,
      count,
    })
  );

  return {
    key,
    totalClicks: data.length,
    clicksData,
    locationData,
    // @ts-ignore
    browserData: browserDataArray,
  };
}

export interface LocationStatsProps {
  display: string;
  code: string;
  count: number;
}

export type LocationType = "country" | "city" | "region";

export const processLocationData = (
  data: StatsProps["locationData"],
  type: LocationType
): LocationStatsProps[] => {
  const countryCodeMap: { [key: string]: string } = {};

  const results =
    data && data.length > 0
      ? data.reduce<Record<string, number>>((acc, d) => {
          const count = acc[d[type]] || 0;
          acc[d[type]] = count + 1;
          countryCodeMap[d[type]] = d.countryCode;
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

export const dummyData: StatsProps = {
  key: "test",
  totalClicks: 100,
  clicksData: getTimeIntervals("7d").timeIntervals.map((interval) => ({
    ...interval,
    count: 0,
  })),
  // @ts-ignore
  locationData: null,
  browserData: [
    { browser: "Chrome", count: 100 },
    { browser: "Firefox", count: 50 },
    { browser: "Safari", count: 25 },
    { browser: "Edge", count: 10 },
    { browser: "Opera", count: 5 },
  ],
};
