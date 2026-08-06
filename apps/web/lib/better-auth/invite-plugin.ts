import { prisma } from "@/lib/prisma";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { parseVerificationTokenValue } from "./utils";

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

          const parsedValue = parseVerificationTokenValue({
            kind: "invite",
            value: verification.value,
          });

          if (!parsedValue?.isInvite) {
            return;
          }

          const { email } = parsedValue;

          const existingUser =
            await ctx.context.internalAdapter.findUserByEmail(email);

          // Existing users skip invite checks here; accept APIs still enforce membership.
          if (existingUser?.user) {
            return;
          }

          const [projectInvite, partnerInvite] = await Promise.all([
            prisma.projectInvite.findFirst({
              where: {
                email,
              },
              select: {
                email: true,
              },
            }),

            prisma.partnerInvite.findFirst({
              where: {
                email,
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
            email,
            emailVerified: true,
            name: "",
          });
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
