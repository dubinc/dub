import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import {
  apiLogCountAggregateRowSchemaTB,
  apiLogCountFilterSchemaTB,
  apiLogsCountResponseSchema,
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
    workspaceId,
    ...(groupBy && { groupBy }),
    // if we're grouping by routePattern, omit routePattern filter (so all routes are returned)
    ...(routePattern && groupBy !== "routePattern" && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(requestType && { requestType }),
    ...(start && { start }),
    ...(end && { end }),
  };

  const pipe = tb.buildPipe({
    pipe: "get_api_logs_count",
    parameters: apiLogCountFilterSchemaTB,
    data: z.any(),
  });

  const result = await pipe(baseParams);

  if (groupBy === "routePattern") {
    return apiLogsCountResponseSchema.parse(result.data);
  }

  const aggregate = apiLogCountAggregateRowSchemaTB.safeParse(result.data[0]);
  const count = aggregate.success ? aggregate.data.count : 0;

  return apiLogsCountResponseSchema.parse([{ routePattern: "all", count }]);
}
