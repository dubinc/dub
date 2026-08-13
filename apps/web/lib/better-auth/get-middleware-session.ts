import { getSessionCookie } from "better-auth/cookies";
import type { SessionUser } from "./get-session";
import { readCookieCache } from "./read-cookie-cache";

// Edge middleware cannot import the Better Auth server (Prisma, Jackson/SAML,
// Node dns/net) — that balloons middleware.js from ~0.9 MB to ~4 MB. Cookies
// only: getCookieCache is HMAC-verified (user). getSessionCookie is an
// unverified presence hint so a cache miss does not bounce a valid session to
// /login; never treat it as authorization. API/RSC use getServerSession with
// disableCookieCache so revoke wins.
export async function getMiddlewareSession(req: Request) {
  const hasUnverifiedSessionCookie = Boolean(getSessionCookie(req));
  const cached = await readCookieCache(req).catch(() => null);

  return {
    user: toMiddlewareUser(cached?.user),
    hasUnverifiedSessionCookie,
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
