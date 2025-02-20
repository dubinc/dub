import { formatDate } from "../..";

export const formatPeriod = (d: {
  periodStart?: Date | null;
  periodEnd?: Date | null;
}) => {
  if (!d.periodStart || !d.periodEnd) {
    return "-";
  }

  return `${formatDate(d.periodStart, {
    month: "short",
    year:
      new Date(d.periodStart).getUTCFullYear() ===
      new Date(d.periodEnd).getUTCFullYear()
        ? undefined
        : "numeric",
    timeZone: "utc",
  })}-${formatDate(d.periodEnd, {
    month: "short",
    timeZone: "utc",
  })}`;
};
