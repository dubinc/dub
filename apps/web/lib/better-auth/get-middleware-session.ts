import { getSessionCookie } from "better-auth/cookies";
import type { SessionUser } from "./get-session";
import { readCookieCache } from "./read-cookie-cache";

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
