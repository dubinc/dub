import { getDaysDifference } from "@dub/utils";

export const formatDateTooltip = (
  date: Date,
  {
    interval,
    start,
    end,
    dataAvailableFrom,
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  }: {
    interval?: string;
    start?: string | Date | null;
    end?: string | Date | null;
    dataAvailableFrom?: Date;
    timezone?: string;
  },
) => {
  // Convert date to local timezone (or provided timezone if specified)
  const targetDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone }),
  );

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
      return targetDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
      });
    else if (daysDifference > 180)
      return targetDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
  } else if (interval) {
    switch (interval) {
      case "24h":
        return targetDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
        });
      case "ytd":
      case "1y":
      case "all":
        return targetDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      default:
        break;
    }
  }

  return targetDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};
