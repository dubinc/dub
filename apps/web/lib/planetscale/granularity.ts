import { DateTime } from "luxon";

export const sqlGranularityMap: Record<
  string,
  {
    dateFormat: string;
    dateIncrement: (dt: DateTime) => DateTime;
    startFunction: (dt: DateTime) => DateTime;
    formatString: string;
  }
> = {
  month: {
    dateFormat: "%Y-%m",
    dateIncrement: (dt) => dt.plus({ month: 1 }),
    startFunction: (dt) => dt.startOf("month"),
    formatString: "yyyy-MM",
  },
  day: {
    dateFormat: "%Y-%m-%d",
    dateIncrement: (dt) => dt.plus({ day: 1 }),
    startFunction: (dt) => dt.startOf("day"),
    formatString: "yyyy-MM-dd",
  },
  hour: {
    dateFormat: "%Y-%m-%d %H:00",
    dateIncrement: (dt) => dt.plus({ hour: 1 }),
    startFunction: (dt) => dt.startOf("hour"),
    formatString: "yyyy-MM-dd HH:00",
  },
  minute: {
    dateFormat: "%Y-%m-%d %H:%i",
    dateIncrement: (dt) => dt.plus({ minute: 1 }),
    startFunction: (dt) => dt.startOf("minute"),
    formatString: "yyyy-MM-dd HH:mm",
  },
} as const;
