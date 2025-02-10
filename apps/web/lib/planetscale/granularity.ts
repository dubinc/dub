import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  startOfDay,
  startOfHour,
  startOfMinute,
} from "date-fns";

export const sqlGranularityMap = {
  month: {
    dateFormat: "%Y-%m",
    dateIncrement: (date: Date) => addMonths(date, 1),
    startFunction: (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), 1),
    formatString: "yyyy-MM",
  },
  day: {
    dateFormat: "%Y-%m-%d",
    dateIncrement: (date: Date) => addDays(date, 1),
    startFunction: startOfDay,
    formatString: "yyyy-MM-dd",
  },
  hour: {
    dateFormat: "%Y-%m-%d %H:00",
    dateIncrement: (date: Date) => addHours(date, 1),
    startFunction: startOfHour,
    formatString: "yyyy-MM-dd HH:00",
  },
  minute: {
    dateFormat: "%Y-%m-%d %H:%i",
    dateIncrement: (date: Date) => addMinutes(date, 1),
    startFunction: startOfMinute,
    formatString: "yyyy-MM-dd HH:mm",
  },
} as const;
