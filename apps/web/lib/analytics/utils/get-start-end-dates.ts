import { tz, TZDate } from "@date-fns/tz";
import { differenceInDays, endOfDay, startOfDay } from "date-fns";
import { getIntervalData } from "./get-interval-data";
import { sanitizeTimezone } from "./sanitize-timezone";

export const getStartEndDates = ({
  interval,
  start,
  end,
  dataAvailableFrom,
  timezone,
}: {
  interval?: string;
  start?: string | Date | null;
  end?: string | Date | null;
  dataAvailableFrom?: Date;
  timezone?: string;
}) => {
  timezone = sanitizeTimezone(timezone);

  let startDate: TZDate;
  let endDate: TZDate;
  let granularity: "hour" | "day" | "month" = "day";

  if (start || (interval === "all" && dataAvailableFrom)) {
    let rangeStart = new Date(start ?? dataAvailableFrom ?? Date.now());
    let rangeEnd = new Date(end ?? Date.now());

    // Swap start and end if start is greater than end, before the day boundaries and the granularity are set
    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }

    startDate = startOfDay(new TZDate(rangeStart, timezone));
    endDate = endOfDay(new TZDate(rangeEnd, timezone));

    const daysDifference = differenceInDays(endDate, startDate, {
      in: tz(timezone),
    });

    if (daysDifference <= 2) {
      granularity = "hour";
    } else if (daysDifference > 90) {
      granularity = "month";
    }
  } else {
    interval = interval ?? "30d";
    const intervalData = getIntervalData(interval, { timezone });
    startDate = intervalData.startDate;
    endDate = intervalData.endDate;
    granularity = intervalData.granularity;
  }

  return { startDate, endDate, granularity };
};
