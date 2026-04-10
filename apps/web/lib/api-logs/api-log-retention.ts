import { PlanProps } from "@/lib/types";
import { API_LOG_RETENTION_DAYS, DEFAULT_RETENTION_DAYS } from "./constants";

export function getApiLogsDateRange(plan: PlanProps) {
  const days = API_LOG_RETENTION_DAYS[plan] ?? DEFAULT_RETENTION_DAYS;

  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: new Date().toISOString().replace("T", " ").replace("Z", ""),
  };
}
