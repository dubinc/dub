import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import {
  apiLogCountAggregateRowSchemaTB,
  apiLogCountFilterSchemaTB,
  apiLogCountRowSchemas,
  getApiLogsCountQuerySchema,
} from "./schemas";

type GetApiLogsCountParams = Omit<
  z.infer<typeof getApiLogsCountQuerySchema>,
  "start" | "end" | "timezone" | "exactRange"
> & {
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
    // if we're grouping by a dimension, omit that filter so all values are returned
    ...(routePattern && groupBy !== "routePattern" && { routePattern }),
    ...(method && groupBy !== "method" && { method }),
    ...(statusCode && groupBy !== "statusCode" && { statusCode }),
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

  if (groupBy) {
    return z.array(apiLogCountRowSchemas[groupBy]).parse(result.data);
  }

  const aggregate = apiLogCountAggregateRowSchemaTB.safeParse(result.data[0]);
  const count = aggregate.success ? aggregate.data.count : 0;

  return z
    .array(apiLogCountRowSchemas.routePattern)
    .parse([{ routePattern: "all", count }]);
}
