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
    startDate = startOfDay(
      new TZDate(new Date(start ?? dataAvailableFrom ?? Date.now()), timezone),
    );
    endDate = endOfDay(new TZDate(new Date(end ?? Date.now()), timezone));

    const daysDifference = differenceInDays(endDate, startDate, {
      in: tz(timezone ?? "UTC"),
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
