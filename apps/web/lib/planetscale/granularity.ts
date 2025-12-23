import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
} from "date-fns";

export const sqlGranularityMap: Record<
  string,
  {
    dateFormat: string;
    dateIncrement: (dt: Date) => Date;
    startFunction: (dt: Date) => Date;
    formatString: string;
  }
> = {
  month: {
    dateFormat: "%Y-%m",
    dateIncrement: (dt) => addMonths(dt, 1),
    startFunction: (dt) => startOfMonth(dt),
    formatString: "yyyy-MM",
  },
  day: {
    dateFormat: "%Y-%m-%d",
    dateIncrement: (dt) => addDays(dt, 1),
    startFunction: (dt) => startOfDay(dt),
    formatString: "yyyy-MM-dd",
  },
  hour: {
    dateFormat: "%Y-%m-%d %H:00",
    dateIncrement: (dt) => addHours(dt, 1),
    startFunction: (dt) => startOfHour(dt),
    formatString: "yyyy-MM-dd HH:00",
  },
  minute: {
    dateFormat: "%Y-%m-%d %H:%i",
    dateIncrement: (dt) => addMinutes(dt, 1),
    startFunction: (dt) => startOfMinute(dt),
    formatString: "yyyy-MM-dd HH:mm",
  },
} as const;
