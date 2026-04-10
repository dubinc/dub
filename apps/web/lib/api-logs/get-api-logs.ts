import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import { API_LOGS_MAX_PAGE_SIZE } from "./constants";
import {
  apiLogByIdFilterSchemaTB,
  apiLogCountFilterSchemaTB,
  apiLogCountResponseSchemaTB,
  apiLogFilterSchemaTB,
  apiLogResponseSchemaTB,
} from "./schemas";

type GetApiLogsParams = z.infer<typeof apiLogFilterSchemaTB>;
type GetApiLogsCountParams = z.infer<typeof apiLogCountFilterSchemaTB>;
type GetApiLogByIdParams = z.infer<typeof apiLogByIdFilterSchemaTB>;

export const getApiLogs = async ({
  workspaceId,
  routePattern,
  method,
  statusCode,
  tokenId,
  requestId,
  start,
  limit = API_LOGS_MAX_PAGE_SIZE,
  offset = 0,
}: GetApiLogsParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_logs",
    parameters: apiLogFilterSchemaTB,
    data: apiLogResponseSchemaTB,
  });

  const logs = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    limit,
    offset,
    ...(routePattern && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(start && { start }),
    end: new Date().toISOString(),
  });

  return logs.data;
};

export async function getApiLogsCount({
  workspaceId,
  routePattern,
  method,
  statusCode,
  tokenId,
  requestId,
  start,
  groupBy,
}: GetApiLogsCountParams) {
  const baseParams = {
    workspaceId: prefixWorkspaceId(workspaceId),
    ...(groupBy && { groupBy }),
    ...(routePattern && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(start && { start }),
    end: new Date().toISOString(),
  };

  const pipe = tb.buildPipe({
    pipe: "count_api_logs",
    parameters: apiLogCountFilterSchemaTB,
    data: z.union([
      apiLogCountResponseSchemaTB.count,
      apiLogCountResponseSchemaTB.routePattern,
    ]),
  });

  return await pipe(baseParams);
}

export const getApiLogById = async ({
  workspaceId,
  id,
}: GetApiLogByIdParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_log_by_id",
    parameters: apiLogByIdFilterSchemaTB,
    data: apiLogResponseSchemaTB,
  });

  const logs = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    id,
  });

  return logs.data[0] || null;
};
