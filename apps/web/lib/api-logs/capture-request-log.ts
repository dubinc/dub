import { WorkspaceWithUsers } from "@/lib/types";
import { waitUntil } from "@vercel/functions";
import { minimatch } from "minimatch";
import { TokenCacheItem } from "../auth/token-cache";
import { Session } from "../auth/utils";
import {
  HTTP_METHODS,
  LOGGED_API_PATH_PATTERNS,
  ROUTE_PATTERNS,
} from "./constants";
import { recordApiLog } from "./record-api-log";

export function shouldLogRoute(pathname: string) {
  return LOGGED_API_PATH_PATTERNS.some((pattern) =>
    minimatch(pathname, pattern),
  );
}

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
  const normalized = path.startsWith("/") ? path.slice(1) : path;

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
  const isMutation = HTTP_METHODS.includes(
    req.method as (typeof HTTP_METHODS)[number],
  );
  if (!isMutation || !shouldLogRoute(url.pathname)) {
    return;
  }

  const duration = Date.now() - startTime;
  const responseClone = response.clone();
  const routePattern = getRoutePattern(url.pathname);

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
      });
    })(),
  );
}
