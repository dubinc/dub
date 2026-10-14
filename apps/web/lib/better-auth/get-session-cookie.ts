import { getSessionCookie as getBetterAuthSessionCookie } from "better-auth/cookies";
import { getCookieCache } from "./get-cookie-cache";
import type { SessionUser } from "./get-session";

// For cookie-only checks (faster but less secure)
// This function only checks for the existence of a session cookie; it does not validate it.
export async function getSessionCookie(req: Request) {
  const hasUnverifiedSessionCookie = Boolean(getBetterAuthSessionCookie(req));
  const cached = await getCookieCache(req).catch(() => null);

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
