import { getDaysDifference } from "@dub/utils";

export const formatDateTooltip = (
  date: Date,
  {
    interval,
    start,
    end,
    dataAvailableFrom,
  }: {
    interval?: string;
    start?: string | Date | null;
    end?: string | Date | null;
    dataAvailableFrom?: Date;
  },
) => {
  if (interval === "all" && dataAvailableFrom) {
    start = dataAvailableFrom;
    end = new Date(Date.now());
  }

  if (start && end) {
    const daysDifference = getDaysDifference(
      typeof start === "string" ? new Date(start) : start,
      typeof end === "string" ? new Date(end) : end,
    );

    if (daysDifference <= 2)
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
      });
    else if (daysDifference > 180)
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
  } else if (interval) {
    switch (interval) {
      case "24h":
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
        });
      case "ytd":
      case "1y":
      case "all":
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      default:
        break;
    }
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};
