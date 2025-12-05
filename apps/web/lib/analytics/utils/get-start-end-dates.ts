import { tz, TZDate } from "@date-fns/tz";
import { differenceInDays, endOfDay, startOfDay } from "date-fns";
import { getIntervalData } from "./get-interval-data";

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
  let startDate: TZDate;
  let endDate: TZDate;
  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start || (interval === "all" && dataAvailableFrom)) {
    startDate = new TZDate(
      startOfDay(start ?? dataAvailableFrom ?? Date.now()),
      timezone,
    );
    endDate = new TZDate(endOfDay(end ?? Date.now()), timezone);

    const daysDifference = differenceInDays(
      endDate,
      startDate,
      timezone ? { in: tz(timezone) } : undefined,
    );

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
    granularity = intervalData.granularity;
    endDate = new TZDate(endOfDay(Date.now()), timezone);
  }

  return { startDate, endDate, granularity };
};
