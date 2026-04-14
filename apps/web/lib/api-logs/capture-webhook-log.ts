import { WEBHOOK_REQUEST_ACTORS_BY_PATH } from "./constants";
import { recordApiLog } from "./record-api-log";

async function parseResponseBody(responseBody: unknown): Promise<unknown> {
  if (responseBody instanceof Response) {
    try {
      return await responseBody.clone().json();
    } catch {
      return null;
    }
  }

  return responseBody;
}

export async function captureWebhookLog({
  workspaceId,
  method,
  path,
  statusCode,
  duration,
  requestBody,
  responseBody,
  userAgent,
}: {
  workspaceId: string;
  method: string;
  path: keyof typeof WEBHOOK_REQUEST_ACTORS_BY_PATH;
  statusCode: number;
  duration: number;
  requestBody: unknown;
  responseBody: unknown;
  userAgent: string | null;
}) {
  const actor = WEBHOOK_REQUEST_ACTORS_BY_PATH[path];
  return await recordApiLog({
    workspaceId,
    method,
    path,
    routePattern: path,
    statusCode,
    duration,
    userAgent,
    requestBody,
    responseBody: await parseResponseBody(responseBody),
    tokenId: null,
    userId: actor.id,
    requestType: "webhook",
  });
}
