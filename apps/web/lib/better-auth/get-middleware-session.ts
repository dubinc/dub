import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { SessionUser } from "./get-session";

// Middleware previously called getServerSession, which imports the Better Auth
// server (Prisma adapter, Jackson/SAML, Node dns/net). That inflated
// middleware.js from ~0.9 MB to ~4 MB. This helper reads HMAC-verified cookies
// only. Cache miss with a session token still counts as authenticated so we
// don't bounce valid sessions to /login; user-based redirects wait for cache.
// API/RSC still use getServerSession with disableCookieCache so revoke wins.
export async function getMiddlewareSession(req: Request) {
  const hasSessionToken = Boolean(getSessionCookie(req));
  const cached = await getCookieCache(req).catch(() => null);
  const user = toMiddlewareUser(cached?.user);

  return {
    user,
    hasSessionToken,
  };
}

function toMiddlewareUser(user: unknown): SessionUser | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const candidate = user as Partial<SessionUser>;

  if (typeof candidate.id !== "string" || typeof candidate.email !== "string") {
    return null;
  }

  return candidate as SessionUser;
}
