import { NextRequest } from "next/server";

export interface RawStatsProps {
  geo: NextRequest["geo"];
  ua: any;
  timestamp: number;
}

export interface StatsProps {
  key: string;
  totalClicks: number;
  clicksData: { start: number; end: number; count: number }[];
  geoData: { country: string; count: number }[];
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
  interval?: IntervalProps // if undefined, 24h is used
): StatsProps {
  const { timeIntervals } = getTimeIntervals(interval || "7d");

  const clicksData = timeIntervals.map((interval) => ({
    ...interval,
    count: data.filter(
      (d) => d.timestamp > interval.start && d.timestamp < interval.end
    ).length,
  }));

  const geoData =
    data.length > 0
      ? data.reduce((acc, d) => {
          const country = d.geo?.country;
          // @ts-ignore
          const count = acc[country] || 0;
          // @ts-ignore
          acc[country] = count + 1;
          return acc;
        }, {})
      : {};

  const geoDataArray = Object.entries(geoData).map(([country, count]) => ({
    country,
    count,
  }));

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
    // @ts-ignore
    geoData: geoDataArray,
    // @ts-ignore
    browserData: browserDataArray,
  };
}

export const dummyData: StatsProps = {
  key: "test",
  totalClicks: 100,
  clicksData: getTimeIntervals("7d").timeIntervals.map((interval) => ({
    ...interval,
    count: 0,
  })),
  geoData: [
    { country: "United States", count: 100 },
    { country: "Canada", count: 50 },
    { country: "United Kingdom", count: 25 },
    { country: "France", count: 10 },
    { country: "Germany", count: 5 },
  ],
  browserData: [
    { browser: "Chrome", count: 100 },
    { browser: "Firefox", count: 50 },
    { browser: "Safari", count: 25 },
    { browser: "Edge", count: 10 },
    { browser: "Opera", count: 5 },
  ],
};
