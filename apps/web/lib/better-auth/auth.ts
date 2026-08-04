import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getIP } from "@/lib/api/utils/get-ip";
import { isSamlEnforcedForEmailDomain } from "@/lib/api/workspaces/is-saml-enforced-for-email-domain";
import {
  EMAIL_OTP_EXPIRY_IN,
  PASSWORD_RESET_TOKEN_EXPIRY,
} from "@/lib/auth/constants";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { sendEmail } from "@dub/email";
import LoginLink from "@dub/email/templates/login-link";
import PasswordUpdated from "@dub/email/templates/password-updated";
import ResetPasswordLink from "@dub/email/templates/reset-password-link";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { databaseHooks } from "./database-hooks";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

const SIGN_IN_PATHS = new Set(["/sign-in/email", "/sign-in/magic-link"]);

async function throwRateLimitAsApiError(error: unknown) {
  if (error instanceof DubApiError) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: error.message,
    });
  }
  throw error;
}

async function enforceSignInGuards(email: string, path: string) {
  const isLinkSend = path === "/sign-in/magic-link";

  try {
    await assertRateLimit({
      policy: isLinkSend
        ? RATELIMIT_POLICIES.loginLinkSend
        : RATELIMIT_POLICIES.login,
      identifier: email,
    });
  } catch (error) {
    await throwRateLimitAsApiError(error);
  }

  if (await isSamlEnforcedForEmailDomain(email)) {
    throw new APIError("FORBIDDEN", {
      message: "require-saml-sso",
    });
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  trustedOrigins: [APP_DOMAIN, PARTNERS_DOMAIN],
  emailAndPassword: {
    enabled: true,
    // OTP already proved ownership before we call signUpEmail
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 1000,
    resetPasswordTokenExpiresIn: PASSWORD_RESET_TOKEN_EXPIRY,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => {
        return await validatePassword({
          password,
          passwordHash: hash,
        });
      },
    },
    sendResetPassword: async ({ user, url }) => {
      waitUntil(
        sendEmail({
          subject: "Dub: Password reset instructions",
          to: user.email,
          react: ResetPasswordLink({
            email: user.email,
            url,
          }),
        }),
      );
    },
    onPasswordReset: async ({ user }) => {
      waitUntil(
        (async () => {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { emailVerified: true },
          });

          if (!dbUser) {
            return;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              lockedAt: null,
              ...(!dbUser.emailVerified && { emailVerified: new Date() }),
            },
          });

          await sendEmail({
            subject: "Your Dub account password has been reset",
            to: user.email,
            react: PasswordUpdated({
              email: user.email,
              verb: "reset",
            }),
          });
        })(),
      );
    },
  },
  user: {
    modelName: "user",
    fields: {
      emailVerified: "emailVerifiedBa",
    },
    additionalFields: {
      isMachine: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
        returned: true,
      },
      defaultWorkspace: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
      defaultPartnerId: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  account: {
    modelName: "authAccount",
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  verification: {
    modelName: "verification",
  },
  advanced: {
    database: {
      generateId: ({ model }) => {
        if (model === "user") {
          return createId({ prefix: "user_" });
        }

        return crypto.randomUUID();
      },
    },
    crossSubDomainCookies: {
      enabled: VERCEL_DEPLOYMENT,
      domain: VERCEL_DEPLOYMENT ? ".dub.co" : undefined,
    },
    useSecureCookies: VERCEL_DEPLOYMENT,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (SIGN_IN_PATHS.has(ctx.path)) {
        const email =
          typeof ctx.body?.email === "string" ? ctx.body.email : undefined;

        if (!email) {
          return;
        }

        await enforceSignInGuards(email, ctx.path);
        return;
      }

      if (ctx.path === "/request-password-reset") {
        const email =
          typeof ctx.body?.email === "string"
            ? ctx.body.email.toLowerCase()
            : undefined;

        if (!email) {
          return;
        }

        try {
          await assertRateLimit({
            policy: RATELIMIT_POLICIES.passwordResetRequest,
            identifier: email,
          });
        } catch (error) {
          await throwRateLimitAsApiError(error);
        }
        return;
      }

      if (ctx.path === "/reset-password" && ctx.method === "POST") {
        try {
          await assertRateLimit({
            policy: RATELIMIT_POLICIES.passwordReset,
            identifier: await getIP(),
          });
        } catch (error) {
          await throwRateLimitAsApiError(error);
        }
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-password") {
        return;
      }

      if (isAPIError(ctx.context.returned)) {
        return;
      }

      const email = ctx.context.session?.user?.email;

      if (!email) {
        return;
      }

      waitUntil(
        sendEmail({
          subject: "Your Dub account password has been updated",
          to: email,
          react: PasswordUpdated({
            email,
          }),
        }),
      );
    }),
  },
  databaseHooks,
  plugins: [
    magicLink({
      expiresIn: EMAIL_OTP_EXPIRY_IN,
      disableSignUp: true,
      async sendMagicLink({ email, url }) {
        waitUntil(
          sendEmail({
            to: email,
            subject: "Your Dub Login Link",
            react: LoginLink({
              email,
              url,
            }),
          }),
        );
      },
    }),
    nextCookies(),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
});
