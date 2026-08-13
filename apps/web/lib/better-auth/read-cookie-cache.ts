import { getCookieCache } from "better-auth/cookies";
import { isVercelDeployment } from "../api/environment";

// Must match auth.ts `advanced.useSecureCookies`. Standalone getCookieCache()
// otherwise assumes NODE_ENV=production means `__Secure-` cookies, which local
// and CI `pnpm start` do not set.
export function readCookieCache(request: Request | Headers) {
  return getCookieCache(request, {
    isSecure: isVercelDeployment,
    secret: process.env.BETTER_AUTH_SECRET,
  });
}
