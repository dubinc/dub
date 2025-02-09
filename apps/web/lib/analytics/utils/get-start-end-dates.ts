import { getDaysDifference } from "@dub/utils";
import { INTERVAL_DATA } from "../constants";

export const getStartEndDates = ({
  interval,
  start,
  end,
  dataAvailableFrom,
}: {
  interval?: string;
  start?: string | Date | null;
  end?: string | Date | null;
  dataAvailableFrom?: Date;
}) => {
  let startDate: Date;
  let endDate: Date;
  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start || (interval === "all" && dataAvailableFrom)) {
    startDate = start
      ? new Date(start)
      : dataAvailableFrom ??
        // this should never happen since we're checking for dataAvailableFrom
        // but typescript doesn't know that
        new Date(Date.now());
    endDate = end ? new Date(end) : new Date(Date.now());

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
    interval = interval ?? "24h";
    startDate = INTERVAL_DATA[interval].startDate;
    endDate = new Date(Date.now());
    granularity = INTERVAL_DATA[interval].granularity;
  }

  return { startDate, endDate, granularity };
};
