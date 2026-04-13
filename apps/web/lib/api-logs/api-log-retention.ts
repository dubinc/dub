import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { PlanProps } from "@/lib/types";
import { subDays } from "date-fns";
import { getStartEndDates } from "../analytics/utils/get-start-end-dates";
import { API_LOG_RETENTION_DAYS, DEFAULT_RETENTION_DAYS } from "./constants";

export function getApiLogsDateRange({
  plan,
  start,
  end,
  interval,
}: {
  plan: PlanProps;
  start?: string;
  end?: string;
  interval?: string;
}) {
  const retentionDays = API_LOG_RETENTION_DAYS[plan] ?? DEFAULT_RETENTION_DAYS;
  const retentionBoundary = subDays(new Date(), retentionDays);

  // If interval or custom start/end provided, resolve them
  if (interval || (start && end)) {
    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    // Clamp start to retention boundary
    const clampedStart =
      startDate < retentionBoundary ? retentionBoundary : startDate;
    const clampedEnd =
      endDate < retentionBoundary ? retentionBoundary : endDate;

    const normalizedStart =
      clampedStart <= clampedEnd ? clampedStart : clampedEnd;
    const normalizedEnd =
      clampedStart <= clampedEnd ? clampedEnd : clampedStart;

    return {
      startDate: formatUTCDateTimeClickhouse(normalizedStart),
      endDate: formatUTCDateTimeClickhouse(normalizedEnd),
    };
  }

  // Default: full retention window
  return {
    startDate: formatUTCDateTimeClickhouse(retentionBoundary),
    endDate: formatUTCDateTimeClickhouse(new Date()),
  };
}
