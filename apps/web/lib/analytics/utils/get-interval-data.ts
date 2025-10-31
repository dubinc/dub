import { DUB_FOUNDING_DATE } from "@dub/utils";
import { DateTime } from "luxon";

export const INTERVAL_DATA: Record<
  string,
  ({ timezone }: { timezone?: string }) => {
    startDate: Date;
    granularity: "minute" | "hour" | "day" | "month";
  }
> = {
  "24h": () => ({
    startDate: new Date(Date.now() - 86400000),
    granularity: "hour",
  }),
  "7d": () => ({
    startDate: new Date(Date.now() - 604800000),
    granularity: "day",
  }),
  "30d": () => ({
    startDate: new Date(Date.now() - 2592000000),
    granularity: "day",
  }),
  "90d": () => ({
    startDate: new Date(Date.now() - 7776000000),
    granularity: "day",
  }),
  "1y": () => ({
    startDate: new Date(Date.now() - 31556952000),
    granularity: "month",
  }),
  mtd: ({ timezone }) => {
    return {
      startDate: timezone
        ? DateTime.now().setZone(timezone).startOf("month").toJSDate()
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      granularity: "day",
    };
  },
  qtd: ({ timezone }) => ({
    startDate: timezone
      ? DateTime.now().setZone(timezone).startOf("quarter").toJSDate()
      : new Date(
          new Date().getFullYear(),
          Math.floor(new Date().getMonth() / 3) * 3,
          1,
        ),
    granularity: "day",
  }),
  ytd: ({ timezone }) => ({
    startDate: timezone
      ? DateTime.now().setZone(timezone).startOf("year").toJSDate()
      : new Date(new Date().getFullYear(), 0, 1),
    granularity: "month",
  }),
  all: () => ({
    startDate: DUB_FOUNDING_DATE,
    granularity: "month",
  }),
};

export const getIntervalData = (
  interval: string,
  { timezone }: { timezone?: string } = {},
) => INTERVAL_DATA[interval]({ timezone });
