import { WorkspaceWithUsers } from "@/lib/types";
import { waitUntil } from "@vercel/functions";
import { TokenCacheItem } from "../auth/token-cache";
import { Session } from "../auth/utils";
import { recordApiLog } from "./record-api-log";

const LOGGED_PATH_PREFIXES = [
  "/api/track/lead",
  "/api/track/sale",
  "/api/track/open",
  "/api/partners",
  "/api/tokens/embed/referrals",
  "/api/customers",
  "/api/links",
];

export function shouldLogRoute(pathname: string) {
  return LOGGED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
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
