import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import {
  apiLogCountFilterSchemaTB,
  apiLogCountResponseSchemaTB,
  getApiLogsCountQuerySchema,
} from "./schemas";

type GetApiLogsCountParams = z.infer<typeof getApiLogsCountQuerySchema> & {
  workspaceId: string;
  start: string;
  end: string;
};

export async function getApiLogsCount(params: GetApiLogsCountParams) {
  const {
    workspaceId,
    routePattern,
    method,
    statusCode,
    tokenId,
    requestId,
    requestType,
    start,
    end,
    groupBy,
  } = params;

  const baseParams = {
    workspaceId: prefixWorkspaceId(workspaceId),
    ...(groupBy && { groupBy }),
    ...(routePattern && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(requestType && { requestType }),
    ...(start && { start }),
    ...(end && { end }),
  };

  const pipe = tb.buildPipe({
    pipe: "count_api_logs",
    parameters: apiLogCountFilterSchemaTB,
    data: z.any(),
  });

  const result = await pipe(baseParams);

  if (groupBy === "routePattern") {
    return z.array(apiLogCountResponseSchemaTB.routePattern).parse(result.data);
  }

  return result.data[0]?.count ?? 0;
}
