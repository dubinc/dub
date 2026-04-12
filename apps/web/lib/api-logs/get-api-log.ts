import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { apiLogByIdFilterSchemaTB, apiLogSchemaTB } from "./schemas";

type GetApiLogByIdParams = z.infer<typeof apiLogByIdFilterSchemaTB>;

export const getApiLogById = async ({
  workspaceId,
  id,
}: GetApiLogByIdParams) => {
  const pipe = tb.buildPipe({
    pipe: "get_api_log_by_id",
    parameters: apiLogByIdFilterSchemaTB,
    data: apiLogSchemaTB,
  });

  const logs = await pipe({
    workspaceId,
    id,
  });

  return logs.data[0] || null;
};
