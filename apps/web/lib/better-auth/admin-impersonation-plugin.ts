import { markAdminImpersonation } from "@/lib/auth/admin-impersonation";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import {
  createVerificationToken,
  findVerificationToken,
} from "./verification-token";

function buildVerifyUrl(origin: string, token: string, callbackURL: string) {
  const url = new URL("/api/auth/magic-link/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

export async function createImpersonationUrls(email: string) {
  const [{ token: appToken }, { token: partnersToken }] = await Promise.all([
    createVerificationToken({
      kind: "adminImpersonation",
      value: {
        email,
        isAdminImpersonation: true,
      },
    }),

    createVerificationToken({
      kind: "adminImpersonation",
      value: {
        email,
        isAdminImpersonation: true,
      },
    }),
  ]);

  return {
    app: buildVerifyUrl(APP_DOMAIN, appToken, APP_DOMAIN),
    partners: buildVerifyUrl(PARTNERS_DOMAIN, partnersToken, PARTNERS_DOMAIN),
  };
}

// Mark impersonation in /magic-link/verify before, not verification.delete.after.
// Better Auth queues *.after hooks until the whole handler finishes (including
// on throw), so session.create.before never saw the Redis flag in-request.
export const adminImpersonation = {
  id: "admin-impersonation",
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === "/magic-link/verify",
        handler: createAuthMiddleware(async (ctx) => {
          const token = ctx.query?.token;
          if (typeof token !== "string" || !token) {
            return;
          }

          const verification = await findVerificationToken({
            kind: "adminImpersonation",
            identifier: token,
          });

          if (!verification || verification.isExpired) {
            return;
          }

          await markAdminImpersonation(verification.value.email);
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
