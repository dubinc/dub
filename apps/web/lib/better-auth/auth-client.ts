import {
  genericOAuthClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

const isVercelDeployment =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),

    magicLinkClient(),

    genericOAuthClient(),

    lastLoginMethodClient({
      // Must match auth.ts crossSubDomainCookies.domain
      domain: isVercelDeployment ? ".dub.co" : undefined,
    }),
  ],
});
