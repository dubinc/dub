import { WorkspaceWithUsers } from "@/lib/types";
import { waitUntil } from "@vercel/functions";
import { TokenCacheItem } from "../auth/token-cache";
import { Session } from "../auth/utils";
import { HTTP_MUTATION_METHODS, ROUTE_PATTERNS } from "./constants";
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

export function captureRequestLog({
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
  workspace: WorkspaceWithUsers;
  session: Session | undefined;
  token: TokenCacheItem | null;
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

  waitUntil(
    (async () => {
      let requestBody = null;
      let responseBody = null;

      try {
        requestBody = await req.json();
      } catch {}

      try {
        responseBody = await responseClone.json();
      } catch {}

      await recordApiLog({
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
    })(),
  );
}
