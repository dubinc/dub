import { PlanProps } from "@/lib/types";
import { API_LOG_RETENTION_DAYS, DEFAULT_RETENTION_DAYS } from "./constants";

export function getApiLogsRetentionDays(
  plan: PlanProps | string | undefined,
): number {
  if (!plan) {
    return API_LOG_RETENTION_DAYS.free;
  }

  return API_LOG_RETENTION_DAYS[plan] ?? DEFAULT_RETENTION_DAYS;
}

export function getApiLogsDateRange(plan: PlanProps | string | undefined) {
  const days = getApiLogsRetentionDays(plan);
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: new Date().toISOString().replace("T", " ").replace("Z", ""),
  };
}
