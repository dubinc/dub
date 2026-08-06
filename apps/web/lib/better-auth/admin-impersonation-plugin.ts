import { markAdminImpersonation } from "@/lib/auth/admin-impersonation";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { parseVerificationTokenValue } from "./utils";
import { createVerificationToken } from "./verification-token";

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

          const verification = await prisma.verification.findFirst({
            where: {
              identifier: token,
            },
            select: {
              value: true,
            },
          });

          if (!verification) {
            return;
          }

          const parsedValue = parseVerificationTokenValue({
            kind: "adminImpersonation",
            value: verification.value,
          });

          if (parsedValue?.isAdminImpersonation) {
            markAdminImpersonation(parsedValue.email);
          }
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
