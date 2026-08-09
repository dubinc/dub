import { prisma } from "@/lib/prisma";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { findVerificationToken } from "./verification-token";

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

          const verification = await findVerificationToken({
            kind: "invite",
            identifier: token,
          });

          if (!verification || verification.isExpired) {
            return;
          }

          const { email } = verification.value;

          const [projectInvite, partnerInvite] = await Promise.all([
            prisma.projectInvite.findFirst({
              where: {
                email,
                expires: {
                  gte: new Date(),
                },
              },
              select: {
                email: true,
              },
            }),

            prisma.partnerInvite.findFirst({
              where: {
                email,
                expires: {
                  gte: new Date(),
                },
              },
              select: {
                email: true,
              },
            }),
          ]);

          if (!projectInvite && !partnerInvite) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid or expired invite.",
            });
          }

          const existingUser =
            await ctx.context.internalAdapter.findUserByEmail(email);

          if (existingUser?.user) {
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
