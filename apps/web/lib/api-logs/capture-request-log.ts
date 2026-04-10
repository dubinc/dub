import { WorkspaceWithUsers } from "@/lib/types";
import { waitUntil } from "@vercel/functions";
import { minimatch } from "minimatch";
import { TokenCacheItem } from "../auth/token-cache";
import { Session } from "../auth/utils";
import { HTTP_METHODS, LOGGED_API_PATH_PATTERNS } from "./constants";
import { recordApiLog } from "./record-api-log";

export function shouldLogRoute(pathname: string) {
  return LOGGED_API_PATH_PATTERNS.some((pattern) =>
    minimatch(pathname, pattern),
  );
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
