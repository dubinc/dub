import { tb } from "@/lib/tinybird";
import type { ApiLogsGranularity } from "@/lib/types";
import * as z from "zod/v4";
import {
  apiLogTimeseriesFilterSchemaTB,
  apiLogTimeseriesRowSchema,
  getApiLogsTimeseriesQuerySchema,
} from "./schemas";

type GetApiLogsTimeseriesParams = Omit<
  z.infer<typeof getApiLogsTimeseriesQuerySchema>,
  "start" | "end" | "timezone" | "exactRange"
> & {
  workspaceId: string;
  start: string;
  end: string;
  timezone: string;
  granularity: ApiLogsGranularity;
};

export async function getApiLogsTimeseries(params: GetApiLogsTimeseriesParams) {
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
    timezone,
    granularity,
  } = params;

  const pipe = tb.buildPipe({
    pipe: "get_api_logs_timeseries",
    parameters: apiLogTimeseriesFilterSchemaTB,
    data: apiLogTimeseriesRowSchema,
  });

  const result = await pipe({
    workspaceId,
    timezone,
    granularity,
    ...(routePattern && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(requestType && { requestType }),
    ...(start && { start }),
    ...(end && { end }),
  });

  return z.array(apiLogTimeseriesRowSchema).parse(result.data);
}
