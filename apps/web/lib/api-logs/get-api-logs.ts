import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import {
  API_LOGS_MAX_PAGE_SIZE,
  apiLogByIdFilterSchemaTB,
  apiLogFilterSchemaTB,
  apiLogResponseSchemaTB,
} from "./schemas";

type GetApiLogsParams = z.infer<typeof apiLogFilterSchemaTB>;
type GetApiLogByIdParams = z.infer<typeof apiLogByIdFilterSchemaTB>;

export const getApiLogs = async ({
  workspaceId,
  path,
  method,
  statusCode,
  tokenId,
  start,
  end,
  limit = API_LOGS_MAX_PAGE_SIZE,
  offset = 0,
}: GetApiLogsParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_logs",
    parameters: apiLogFilterSchemaTB,
    data: apiLogResponseSchemaTB,
  });

  const { startDate, endDate } = getStartEndDates({
    start,
    end,
  });

  const events = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
    limit,
    offset,
    ...(path && { path }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
  });

  return events.data;
};

export const getApiLogById = async ({
  workspaceId,
  id,
}: GetApiLogByIdParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_log_by_id",
    parameters: apiLogByIdFilterSchemaTB,
    data: apiLogResponseSchemaTB,
  });

  const events = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    id,
  });

  return events.data[0] || null;
};
