import { tb } from "@/lib/tinybird";
import { log } from "@dub/utils";
import * as z from "zod/v4";
import { createId } from "../api/create-id";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import { RequestType } from "../types";
import { apiLogSchemaTB } from "./schemas";

type ApiLogInput = z.infer<typeof apiLogSchemaTB>;

const recordApiLogTB = tb.buildIngestEndpoint({
  datasource: "dub_api_logs",
  event: apiLogSchemaTB,
  wait: true,
});

export const recordApiLog = async ({
  workspaceId,
  method,
  path,
  routePattern,
  statusCode,
  duration,
  userAgent,
  requestBody,
  responseBody,
  tokenId,
  userId,
  requestType,
}: {
  workspaceId: string;
  method: string;
  path: string;
  routePattern: string;
  statusCode: number;
  duration: number;
  userAgent: string | null;
  requestBody: unknown;
  responseBody: unknown;
  tokenId: string | null;
  userId: string | null;
  requestType: RequestType;
}) => {
  const apiLog: ApiLogInput = {
    id: createId({ prefix: "req_" }),
    timestamp: new Date().toISOString(),
    workspace_id: prefixWorkspaceId(workspaceId),
    method,
    path,
    route_pattern: routePattern,
    status_code: statusCode,
    duration,
    user_agent: userAgent ?? "",
    request_body: JSON.stringify(requestBody),
    response_body: JSON.stringify(responseBody),
    token_id: tokenId ?? "",
    user_id: userId ?? "",
    request_type: requestType,
  };

  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await recordApiLogTB(apiLog);
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt)),
        );
        continue;
      }

      console.error("Failed to record API log", error, JSON.stringify(apiLog));

      await log({
        message: "Failed to record API log. See logs for more details.",
        type: "errors",
        mention: true,
      });
    }
  }
};
