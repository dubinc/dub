import {
  genericOAuthClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

const VERCEL_DEPLOYMENT = !!process.env.NEXT_PUBLIC_VERCEL_URL;

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),

    magicLinkClient(),

    genericOAuthClient(),

    lastLoginMethodClient({
      domain: VERCEL_DEPLOYMENT ? ".dub.co" : undefined,
    }),
  ],
});

const LAST_LOGIN_METHOD_COOKIE = "better-auth.last_used_login_method";
const LAST_LOGIN_METHOD_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// TODO:
// Remove this after the migration completes
export function setLastUsedLoginMethod(method: string) {
  if (typeof document === "undefined") {
    return;
  }

  const parts = [
    `${LAST_LOGIN_METHOD_COOKIE}=${method}`,
    "path=/",
    `max-age=${LAST_LOGIN_METHOD_MAX_AGE}`,
  ];

  if (VERCEL_DEPLOYMENT) {
    parts.push("domain=.dub.co", "secure", "samesite=lax");
  }

  document.cookie = parts.join("; ");
}
