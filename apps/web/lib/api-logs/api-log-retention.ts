import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { PlanProps } from "@/lib/types";
import { subDays } from "date-fns";
import { API_LOG_RETENTION_DAYS, DEFAULT_RETENTION_DAYS } from "./constants";

export function getApiLogsDateRange(plan: PlanProps) {
  const days = API_LOG_RETENTION_DAYS[plan] ?? DEFAULT_RETENTION_DAYS;

  const end = new Date();
  const start = subDays(end, days);

  return {
    start: formatUTCDateTimeClickhouse(start),
    end: formatUTCDateTimeClickhouse(end),
  };
}
