import { tb } from "@/lib/tinybird";
import { createId } from "../create-id";
import { prefixWorkspaceId } from "../workspaces/workspace-id";
import { apiLogSchemaTB } from "./schemas";

const recordApiLogTB = tb.buildIngestEndpoint({
  datasource: "dub_api_logs",
  event: apiLogSchemaTB,
  wait: true,
});

export const recordApiLog = async ({
  workspaceId,
  method,
  path,
  statusCode,
  duration,
  userAgent,
  requestBody,
  responseBody,
  tokenId,
  userId,
}: {
  workspaceId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent: string | null;
  requestBody: unknown;
  responseBody: unknown;
  tokenId: string | null;
  userId: string | null;
}) => {
  try {
    await recordApiLogTB([
      {
        id: createId({ prefix: "req_" }),
        timestamp: new Date().toISOString(),
        workspace_id: prefixWorkspaceId(workspaceId),
        method,
        path,
        status_code: statusCode,
        duration,
        user_agent: userAgent ?? "",
        request_body: JSON.stringify(requestBody),
        response_body: JSON.stringify(responseBody),
        token_id: tokenId ?? "",
        user_id: userId ?? "",
      },
    ]);
  } catch (error) {
    console.error("Failed to record API log", error);
  }
};
