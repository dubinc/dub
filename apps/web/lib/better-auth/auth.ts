import { createId } from "@/lib/api/create-id";
import {
  EMAIL_OTP_EXPIRY_IN,
  PASSWORD_RESET_TOKEN_EXPIRY,
} from "@/lib/auth/constants";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import LoginLink from "@dub/email/templates/login-link";
import PasswordUpdated from "@dub/email/templates/password-updated";
import ResetPasswordLink from "@dub/email/templates/reset-password-link";
import { APP_DOMAIN, nanoid, PARTNERS_DOMAIN } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, lastLoginMethod, magicLink } from "better-auth/plugins";
import { isLocalDev } from "../api/environment";
import { logger, toErrorFields } from "../axiom/server";
import { databaseHooks } from "./database-hooks";
import { hooks } from "./hooks";
import { invite } from "./invite-plugin";
import { programOAuthConfigs, programOAuthProviderIds } from "./program-oauth";
import { samlIdp, samlOAuthConfig } from "./saml-sso-plugin";

const isVercelProduction = process.env.VERCEL_ENV === "production";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [APP_DOMAIN, PARTNERS_DOMAIN],
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  // Google and GitHub social providers
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

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
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
            where: {
              id: user.id,
            },
            select: {
              emailVerified: true,
              emailVerifiedBa: true,
            },
          });

          if (!dbUser) {
            return;
          }

          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              lockedAt: null,
              invalidLoginAttempts: 0,
              ...(!dbUser.emailVerified && { emailVerified: new Date() }),
              ...(!dbUser.emailVerifiedBa && { emailVerifiedBa: true }),
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

  // Database models
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
    modelName: "account",
    accountLinking: {
      enabled: true,
      trustedProviders: [
        "google",
        "github",
        "saml",
        ...programOAuthProviderIds,
      ],
    },
  },
  verification: {
    modelName: "verification",
    additionalFields: {
      lookupKey: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: ({ model }) => {
        if (model === "user") {
          return createId({ prefix: "user_" });
        }

        return nanoid(24);
      },
    },
    crossSubDomainCookies: {
      enabled: isVercelProduction,
      domain: isVercelProduction ? ".dub.co" : undefined,
    },
    useSecureCookies: isVercelProduction,
  },

  hooks,
  databaseHooks,

  plugins: [
    // Magic link plugin
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

    // Last login method plugin
    lastLoginMethod({
      customResolveMethod: (ctx) => {
        if (ctx.path?.startsWith("/magic-link/verify")) {
          return "email";
        }

        if (ctx.path === "/sign-in/saml-idp") {
          return "saml";
        }

        return null;
      },
    }),

    // SAML Jackson SSO + partner program OAuth
    genericOAuth({
      config: [samlOAuthConfig, ...programOAuthConfigs],
    }),

    // SAML IdP-initiated login (Jackson code → session)
    samlIdp,

    // Workspace + partner-profile invite magic links
    invite,

    // Next cookies plugin
    nextCookies(),
  ],

  onAPIError: {
    onError: async (error) => {
      if (isLocalDev) {
        console.error("[BetterAuth] API error:", error);
      }

      logger.error(error instanceof Error ? error.message : "Unknown error", {
        service: "better-auth",
        ...toErrorFields(error),
      });

      await logger.flush();
    },
  },
});
