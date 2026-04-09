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
type GetApiLogByIdParams = z.infer<typeof apiLogByIdFilterSchemaTB>;

export const getApiLogs = async ({
  workspaceId,
  path,
  method,
  statusCode,
  tokenId,
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
    ...(path && { path }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
  });

  return events.data;
};

export const getApiLogsCount = async ({
  workspaceId,
  path,
  method,
  statusCode,
  tokenId,
}: Omit<GetApiLogsParams, "limit" | "offset">) => {
  const pipe = tb.buildPipe({
    pipe: "count_api_logs",
    parameters: apiLogCountFilterSchemaTB,
    data: apiLogCountResponseSchemaTB,
  });

  const result = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    ...(path && { path }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
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
