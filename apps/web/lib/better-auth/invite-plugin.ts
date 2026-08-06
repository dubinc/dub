import { prisma } from "@/lib/prisma";
import { TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { generateRandomString } from "better-auth/crypto";
import { z } from "zod";

const verificationValueSchema = z.object({
  email: z.string().trim().min(1),
  isInvite: z.boolean().optional(),
});

function buildVerifyUrl(origin: string, token: string, callbackURL: string) {
  const url = new URL("/api/auth/magic-link/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

/**
 * Mint a Better Auth Verification row and return a /magic-link/verify URL.
 * There is no public BA API for this without sending email; this matches BA's
 * magic-link storage shape (identifier = raw token, value = JSON email payload).
 *
 * Pass `isInvite: true` for invite flows (allows signup when a pending
 * ProjectInvite / PartnerInvite exists). Login links omit it.
 */
export async function createMagicLinkVerifyUrl({
  email,
  origin,
  callbackURL,
  expiresAt,
  expiresIn = TWO_WEEKS_IN_SECONDS,
  isInvite = false,
}: {
  email: string;
  origin: string;
  callbackURL: string;
  expiresAt?: Date;
  expiresIn?: number;
  isInvite?: boolean;
}) {
  const token = generateRandomString(32, "a-z", "A-Z");

  await prisma.verification.create({
    data: {
      identifier: token,
      expiresAt: expiresAt ?? new Date(Date.now() + expiresIn * 1000),
      value: JSON.stringify({
        email,
        ...(isInvite ? { isInvite: true } : {}),
      }),
    },
  });

  return buildVerifyUrl(origin, token, callbackURL);
}

export async function createInviteMagicLink({
  email,
  origin,
  callbackURL,
  expiresIn = TWO_WEEKS_IN_SECONDS,
}: {
  email: string;
  origin: string;
  callbackURL: string;
  expiresIn?: number;
}) {
  return createMagicLinkVerifyUrl({
    email,
    origin,
    callbackURL,
    expiresIn,
    isInvite: true,
  });
}

export const invite = {
  id: "invite",
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

          if (!parsed.isInvite) {
            return;
          }

          const existingUser =
            await ctx.context.internalAdapter.findUserByEmail(parsed.email);

          // Existing users skip invite checks here; accept APIs still enforce membership.
          if (existingUser?.user) {
            return;
          }

          const [projectInvite, partnerInvite] = await Promise.all([
            prisma.projectInvite.findFirst({
              where: {
                email: parsed.email,
              },
              select: {
                email: true,
              },
            }),

            prisma.partnerInvite.findFirst({
              where: {
                email: parsed.email,
              },
              select: {
                email: true,
              },
            }),
          ]);

          if (!projectInvite && !partnerInvite) {
            return;
          }

          await ctx.context.internalAdapter.createUser({
            email: parsed.email,
            emailVerified: true,
            name: "",
          });
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
