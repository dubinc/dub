import { markAdminImpersonation } from "@/lib/auth/admin-impersonation";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { generateRandomString } from "better-auth/crypto";
import { z } from "zod";

const IMPERSONATION_TOKEN_TTL_MS = 60_000;

const verificationValueSchema = z.object({
  email: z.string().trim().min(1),
  isAdminImpersonation: z.boolean().optional(),
});

function buildVerifyUrl(origin: string, token: string, callbackURL: string) {
  const url = new URL("/api/auth/magic-link/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

export async function createImpersonationUrls(email: string) {
  const [appToken, partnersToken] = await Promise.all([
    createImpersonationToken(email),
    createImpersonationToken(email),
  ]);

  return {
    app: buildVerifyUrl(APP_DOMAIN, appToken, APP_DOMAIN),
    partners: buildVerifyUrl(PARTNERS_DOMAIN, partnersToken, PARTNERS_DOMAIN),
  };
}

async function createImpersonationToken(email: string) {
  const token = generateRandomString(32, "a-z", "A-Z");

  await prisma.verification.create({
    data: {
      identifier: token,
      expiresAt: new Date(Date.now() + IMPERSONATION_TOKEN_TTL_MS),
      value: JSON.stringify({
        email,
        isAdminImpersonation: true,
      }),
    },
  });

  return token;
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

          let parsed: z.infer<typeof verificationValueSchema>;
          try {
            parsed = verificationValueSchema.parse(
              JSON.parse(verification.value),
            );
          } catch {
            return;
          }

          if (parsed.isAdminImpersonation) {
            markAdminImpersonation(parsed.email);
          }
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
