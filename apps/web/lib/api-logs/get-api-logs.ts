import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import { API_LOGS_MAX_PAGE_SIZE, LOGGED_API_PATH_FILTERS } from "./constants";
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

// If path is a predefined filter pattern ending with %, treat it as a prefix match.
// Otherwise treat it as an exact match. This avoids LIKE injection entirely.
function getPathFilter(
  path: string,
): { path: string } | { pathPrefix: string } {
  if (LOGGED_API_PATH_FILTERS.includes(path as any) && path.endsWith("%")) {
    return {
      pathPrefix: path.slice(0, -1),
    };
  }

  return {
    path,
  };
}

export const getApiLogs = async ({
  workspaceId,
  path,
  method,
  statusCode,
  tokenId,
  requestId,
  limit = API_LOGS_MAX_PAGE_SIZE,
  offset = 0,
}: GetApiLogsParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_logs",
    parameters: apiLogFilterSchemaTB,
    data: apiLogResponseSchemaTB,
  });

  const events = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    limit,
    offset,
    ...(path && getPathFilter(path)),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
  });

  return events.data;
};

export const getApiLogsCount = async ({
  workspaceId,
  path,
  method,
  statusCode,
  tokenId,
  requestId,
}: GetApiLogsCountParams) => {
  const pipe = tb.buildPipe({
    pipe: "count_api_logs",
    parameters: apiLogCountFilterSchemaTB,
    data: apiLogCountResponseSchemaTB,
  });

  const result = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    ...(path && getPathFilter(path)),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
  });

  return result.data[0]?.count ?? 0;
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
