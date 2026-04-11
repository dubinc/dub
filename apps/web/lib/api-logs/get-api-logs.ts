import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import { API_LOGS_MAX_PAGE_SIZE } from "./constants";
import { apiLogFilterSchemaTB, apiLogSchemaTB } from "./schemas";

type GetApiLogsParams = z.infer<typeof apiLogFilterSchemaTB>;

export const getApiLogs = async ({
  workspaceId,
  routePattern,
  method,
  statusCode,
  tokenId,
  requestId,
  requestType,
  start,
  end,
  limit = API_LOGS_MAX_PAGE_SIZE,
  offset = 0,
}: GetApiLogsParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_logs",
    parameters: apiLogFilterSchemaTB,
    data: apiLogSchemaTB,
  });

  const logs = await pipe({
    workspaceId: prefixWorkspaceId(workspaceId),
    ...(routePattern && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(requestType && { requestType }),
    ...(start && { start }),
    ...(end && { end }),
    limit,
    offset,
  });

  return logs.data;
};
