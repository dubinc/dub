import { tz, TZDate } from "@date-fns/tz";
import { differenceInDays, endOfDay, startOfDay } from "date-fns";
import { getIntervalData } from "./get-interval-data";

export const getStartEndDates = ({
  interval,
  start,
  end,
  dataAvailableFrom,
  timezone,
  preserveTime = false,
}: {
  interval?: string;
  start?: string | Date | null;
  end?: string | Date | null;
  dataAvailableFrom?: Date;
  timezone?: string;
  // When true, custom `start`/`end` are respected with full time-of-day
  // precision instead of being floored/ceiled to calendar-day boundaries.
  preserveTime?: boolean;
}) => {
  let startDate: TZDate;
  let endDate: TZDate;
  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start || (interval === "all" && dataAvailableFrom)) {
    const rawStart = new TZDate(
      new Date(start ?? dataAvailableFrom ?? Date.now()),
      timezone,
    );
    const rawEnd = new TZDate(new Date(end ?? Date.now()), timezone);

    startDate = preserveTime ? rawStart : startOfDay(rawStart);
    endDate = preserveTime ? rawEnd : endOfDay(rawEnd);

    const daysDifference = differenceInDays(endDate, startDate, {
      in: timezone ? tz(timezone) : undefined,
    });

    if (daysDifference <= 2) {
      granularity = "hour";
    } else if (daysDifference > 180) {
      granularity = "month";
    }

    // Swap start and end if start is greater than end
    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
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
