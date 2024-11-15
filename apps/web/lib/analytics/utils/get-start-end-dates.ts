import { getDaysDifference } from "@dub/utils";
import { INTERVAL_DATA } from "../constants";

export const getStartEndDates = ({
  interval,
  start,
  end,
}: {
  interval?: string;
  start?: string | Date | null;
  end?: string | Date | null;
}) => {
  let startDate: Date;
  let endDate: Date;
  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start) {
    startDate = new Date(start);
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
