import { TZDate } from "@date-fns/tz";
import { DUB_FOUNDING_DATE } from "@dub/utils";
import {
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subHours,
  subMonths,
} from "date-fns";

const INTERVAL_DATA: Record<
  string,
  ({ timezone }: { timezone?: string }) => {
    startDate: TZDate;
    granularity: "minute" | "hour" | "day" | "month";
  }
> = {
  "24h": ({ timezone }) => ({
    startDate: subHours(new TZDate(Date.now(), timezone), 24),
    granularity: "hour",
  }),
  "7d": ({ timezone }) => ({
    startDate: subDays(new TZDate(Date.now(), timezone), 7),
    granularity: "day",
  }),
  "30d": ({ timezone }) => ({
    startDate: subDays(new TZDate(Date.now(), timezone), 30),
    granularity: "day",
  }),
  "90d": ({ timezone }) => ({
    startDate: subDays(new TZDate(Date.now(), timezone), 90),
    granularity: "day",
  }),
  "1y": ({ timezone }) => ({
    startDate: subMonths(new TZDate(Date.now(), timezone), 12),
    granularity: "month",
  }),
  mtd: ({ timezone }) => {
    return {
      startDate: startOfMonth(new TZDate(Date.now(), timezone)),
      granularity: "day",
    };
  },
  qtd: ({ timezone }) => ({
    startDate: startOfQuarter(new TZDate(Date.now(), timezone)),
    granularity: "day",
  }),
  ytd: ({ timezone }) => ({
    startDate: startOfYear(new TZDate(Date.now(), timezone)),
    granularity: "month",
  }),
  all: ({ timezone }) => ({
    startDate: new TZDate(DUB_FOUNDING_DATE, timezone),
    granularity: "month",
  }),
};

export const getIntervalData = (
  interval: string,
  { timezone }: { timezone?: string } = {},
) => INTERVAL_DATA[interval]({ timezone });
