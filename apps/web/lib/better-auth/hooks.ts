import { DubApiError } from "@/lib/api/errors";
import { getIP } from "@/lib/api/utils/get-ip";
import {
  exceededLoginAttemptsThreshold,
  incrementLoginAttempts,
} from "@/lib/auth/lock-account";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { passwordSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import PasswordUpdated from "@dub/email/templates/password-updated";
import { waitUntil } from "@vercel/functions";
import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { isSamlEnforcedForEmailDomain } from "../api/workspaces/is-saml-enforced-for-email-domain";
import { hasCredentialLogin, normalizeEmail } from "./utils";

async function assertAuthRateLimit(
  args: Parameters<typeof assertRateLimit>[0],
) {
  try {
    await assertRateLimit(args);
  } catch (error) {
    if (error instanceof DubApiError) {
      throw new APIError("TOO_MANY_REQUESTS", {
        message: error.message,
      });
    }

    throw error;
  }
}

export const hooks = {
  // Runs before the request is processed
  before: createAuthMiddleware(async (ctx) => {
    const { path, body } = ctx;

    if (path === "/request-password-reset") {
      const email = normalizeEmail(body?.email);
      if (!email) {
        return;
      }

      await assertAuthRateLimit({
        policy: RATELIMIT_POLICIES.passwordResetRequest,
        identifier: email,
      });
    }

    if (path === "/reset-password") {
      await assertAuthRateLimit({
        policy: RATELIMIT_POLICIES.passwordReset,
        identifier: await getIP(),
      });
    }

    if (["/change-password", "/reset-password"].includes(path)) {
      const newPassword = body?.newPassword;
      if (!newPassword) {
        return;
      }

      const { success, error } = passwordSchema.safeParse(newPassword);

      if (!success) {
        throw new APIError("BAD_REQUEST", {
          code: "PASSWORD_REQUIREMENTS_NOT_MET",
          message:
            error.issues[0]?.message ??
            "Password does not meet the requirements.",
        });
      }
    }

    // Rate limit, lock check, and SAML enforcement for email/magic-link sign-in.
    if (["/sign-in/email", "/sign-in/magic-link"].includes(path)) {
      const email = normalizeEmail(body?.email);
      if (!email) {
        return;
      }

      await assertAuthRateLimit({
        policy:
          path === "/sign-in/magic-link"
            ? RATELIMIT_POLICIES.loginLinkSend
            : RATELIMIT_POLICIES.login,
        identifier: email,
      });

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          lockedAt: true,
          invalidLoginAttempts: true,
          emailVerified: true,
          emailVerifiedBa: true,
          accounts: {
            where: {
              providerId: "credential",
            },
            select: {
              password: true,
            },
            take: 1,
          },
        },
      });

      if (user && (user.lockedAt || exceededLoginAttemptsThreshold(user))) {
        throw new APIError("FORBIDDEN", {
          message: "exceeded-login-attempts",
        });
      }

      // Password login requires a verified email (legacy DateTime or BA boolean).
      if (
        path === "/sign-in/email" &&
        hasCredentialLogin(user) &&
        !user.emailVerifiedBa &&
        !user.emailVerified
      ) {
        throw new APIError("FORBIDDEN", {
          message: "email-not-verified",
        });
      }

      if (await isSamlEnforcedForEmailDomain(email)) {
        throw new APIError("FORBIDDEN", {
          code: "REQUIRE_SAML_SSO",
          message: "SAML SSO is required for this email address.",
        });
      }
    }
  }),

  // Runs after the request is processed
  after: createAuthMiddleware(async (ctx) => {
    const { path, body, context } = ctx;

    if (path === "/sign-in/email") {
      const email = normalizeEmail(body?.email);

      if (isAPIError(context.returned)) {
        if (
          email &&
          context.returned.body?.code === "INVALID_EMAIL_OR_PASSWORD"
        ) {
          const user = await prisma.user.findUnique({
            where: {
              email,
            },
            select: {
              id: true,
              email: true,
              lockedAt: true,
              invalidLoginAttempts: true,
              accounts: {
                where: {
                  providerId: "credential",
                },
                select: {
                  password: true,
                },
                take: 1,
              },
            },
          });

          if (hasCredentialLogin(user)) {
            const exceededLoginAttempts = exceededLoginAttemptsThreshold(
              await incrementLoginAttempts(user),
            );

            if (exceededLoginAttempts) {
              throw new APIError("FORBIDDEN", {
                message: "exceeded-login-attempts",
              });
            }
          }
        }

        return;
      }

      // Reset login attempts
      if (email) {
        await prisma.user.updateMany({
          where: {
            email,
            invalidLoginAttempts: {
              gt: 0,
            },
          },
          data: {
            invalidLoginAttempts: 0,
          },
        });
      }

      return;
    }

    if (isAPIError(context.returned)) {
      return;
    }

    const email = context.session?.user?.email;

    if (!email) {
      return;
    }

    if (path === "/change-password") {
      waitUntil(
        sendEmail({
          subject: "Your Dub account password has been updated",
          to: email,
          react: PasswordUpdated({
            email,
          }),
        }),
      );
    }
  }),
} satisfies BetterAuthOptions["hooks"];
