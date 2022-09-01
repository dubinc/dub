import { NextRequest } from "next/server";

export interface RawStatsProps {
  geo: NextRequest["geo"];
  ua: any;
  timestamp: number;
}

export interface StatsProps {
  clicksData: { start: number; end: number; count: number }[];
  geoData: { country: string; count: number }[];
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

const getTimeIntervals = (interval: IntervalProps) => {
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
  data: RawStatsProps[],
  interval: IntervalProps
): StatsProps {
  const { startTimestamp, timeIntervals } = getTimeIntervals(interval);

  const clicksData = timeIntervals.map((interval) => ({
    ...interval,
    count: data.filter(
      (d) => d.timestamp > interval.start && d.timestamp < interval.end
    ).length,
  }));

  const filteredData = data.filter((d) => d.timestamp > startTimestamp);
  const geoData =
    filteredData.length > 0
      ? filteredData.reduce((acc, d) => {
          const { country } = d.geo!;
          // @ts-ignore
          const count = acc[country] || 0;
          // @ts-ignore
          acc[country] = count + 1;
          return acc;
        })
      : {};

  const geoDataArray = Object.entries(geoData).map(([country, count]) => ({
    country,
    count,
  }));

  return {
    clicksData: clicksData.map((d) => ({
      ...d,
      count: Math.round(Math.random() * 5000),
    })), // mock data
    // @ts-ignore
    geoData: geoDataArray,
  };
}

export const rangeFormatter = (maxN: number): number => {
  if (maxN < 5) return 5;
  /**
   * Get the max range for a chart based on the maxN value
   */
  return Math.ceil(maxN / 5) * 5;
};
