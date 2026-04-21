import { WorkspaceWithUsers } from "@/lib/types";
import { TokenCacheItem } from "../auth/token-cache";
import { Session } from "../auth/utils";
import { HTTP_MUTATION_METHODS, ROUTE_PATTERNS } from "./constants";
import {
  maskSensitiveFields,
  SENSITIVE_RESPONSE_FIELDS_BY_ROUTE,
} from "./mask-sensitive-fields";
import { recordApiLog } from "./record-api-log";

// Precompile route patterns into regexes at module load
const compiledRoutePatterns = ROUTE_PATTERNS.map((pattern) => {
  const regexStr = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        return "[^/]+";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return {
    pattern,
    regex: new RegExp(`^${regexStr}$`),
  };
});

export function getRoutePattern(path: string): string {
  const normalized = path.startsWith("/api/")
    ? path.replace("/api/", "/")
    : path;

  for (const { pattern, regex } of compiledRoutePatterns) {
    if (regex.test(normalized)) {
      return pattern;
    }
  }

  return "unknown";
}

export async function captureRequestLog({
  req,
  response,
  workspace,
  session,
  token,
  url,
  requestHeaders,
  startTime,
}: {
  req: Request;
  response: Response;
  workspace: Pick<WorkspaceWithUsers, "id">;
  session: Pick<Session, "user"> | undefined;
  token: Pick<TokenCacheItem, "id"> | null;
  url: URL;
  requestHeaders: Headers;
  startTime: number;
}) {
  const isMutation = HTTP_MUTATION_METHODS.includes(
    req.method as (typeof HTTP_MUTATION_METHODS)[number],
  );

  const routePattern = getRoutePattern(url.pathname);

  if (!isMutation || routePattern === "unknown") {
    return;
  }

  const duration = Date.now() - startTime;
  const responseClone = response.clone();

  let requestBody = null;
  let responseBody = null;

  try {
    requestBody = await req.json();
  } catch {}

  try {
    responseBody = await responseClone.json();
  } catch {}

  // Mask sensitive fields in the response body
  if (responseBody) {
    const sensitiveResponseFields =
      SENSITIVE_RESPONSE_FIELDS_BY_ROUTE[routePattern];

    if (sensitiveResponseFields) {
      responseBody = maskSensitiveFields({
        body: responseBody,
        keys: sensitiveResponseFields,
      });
    }
  }

  return await recordApiLog({
    workspaceId: workspace.id,
    method: req.method,
    path: url.pathname,
    routePattern,
    statusCode: response.status,
    duration,
    userAgent: requestHeaders.get("user-agent"),
    requestBody,
    responseBody,
    tokenId: token?.id ?? null,
    userId: session?.user?.id ?? null,
    requestType: "api",
  });
}
