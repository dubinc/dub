import { getCookieCache as getBetterAuthCookieCache } from "better-auth/cookies";
import { isVercelDeployment } from "../api/environment";

// Must match auth.ts `advanced.useSecureCookies`. Standalone getCookieCache()
// otherwise assumes NODE_ENV=production means `__Secure-` cookies, which local
// and CI `pnpm start` do not set.
export function getCookieCache(request: Request | Headers) {
  return getBetterAuthCookieCache(request, {
    isSecure: isVercelDeployment,
    secret: process.env.BETTER_AUTH_SECRET,
  });
}
