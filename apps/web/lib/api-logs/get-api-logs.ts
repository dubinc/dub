import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import {
  apiLogFilterSchemaTB,
  apiLogSchemaTB,
  getApiLogsQuerySchema,
} from "./schemas";

type GetApiLogsParams = Omit<
  z.infer<typeof getApiLogsQuerySchema>,
  "start" | "end"
> & {
  workspaceId: string;
  start: string;
  end: string;
};

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
  page,
  pageSize,
}: GetApiLogsParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_logs",
    parameters: apiLogFilterSchemaTB,
    data: apiLogSchemaTB,
  });

  const logs = await pipe({
    workspaceId,
    ...(routePattern && { routePattern }),
    ...(method && { method }),
    ...(statusCode && { statusCode }),
    ...(tokenId && { tokenId }),
    ...(requestId && { requestId }),
    ...(requestType && { requestType }),
    ...(start && { start }),
    ...(end && { end }),
    ...(page && { offset: (page - 1) * pageSize }),
    ...(pageSize && { limit: pageSize }),
  });

  return logs.data;
};
