import {
  genericOAuthClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

const isVercelProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),

    magicLinkClient(),

    genericOAuthClient(),

    lastLoginMethodClient({
      domain: isVercelProduction ? ".dub.co" : undefined,
    }),
  ],
});
