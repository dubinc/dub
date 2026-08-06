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
