import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import { apiLogByIdFilterSchemaTB, apiLogResponseSchemaTB } from "./schemas";

type GetApiLogByIdParams = z.infer<typeof apiLogByIdFilterSchemaTB>;

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
