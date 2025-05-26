import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
import z from "../zod";

export const CUTOFF_PERIOD = [
  {
    id: "today",
    label: "Today",
    value: endOfDay(new Date()),
  },
  {
    id: "lastMonth",
    label: "Last Month",
    value: endOfMonth(subMonths(new Date(), 1)),
  },
  {
    id: "twoMonthsAgo",
    label: "Two Months Ago",
    value: endOfMonth(subMonths(new Date(), 2)),
  },
  {
    id: "lastQuarter",
    label: "Last Quarter",
    value: endOfQuarter(subQuarters(new Date(), 1)),
  },
  {
    id: "lastYear",
    label: "Last Year",
    value: endOfYear(subYears(new Date(), 1)),
  },
];

export const CUTOFF_PERIOD_ENUM = z
  .enum(CUTOFF_PERIOD.map((c) => c.id) as [string, ...string[]])
  .optional()
  // no need to pass cutoff period if it's today
  .transform((value) => (value === "today" ? undefined : value));

export type CUTOFF_PERIOD_TYPES = z.infer<typeof CUTOFF_PERIOD_ENUM>;
