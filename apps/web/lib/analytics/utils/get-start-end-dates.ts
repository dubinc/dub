import { getDaysDifference } from "@dub/utils";
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
  let startDate: Date;
  let endDate: Date;
  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start || (interval === "all" && dataAvailableFrom)) {
    startDate = new Date(start ?? dataAvailableFrom ?? Date.now());
    endDate = new Date(end ?? Date.now());

    const daysDifference = getDaysDifference(startDate, endDate);

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
    endDate = new Date(Date.now());
  }

  return { startDate, endDate, granularity };
};
