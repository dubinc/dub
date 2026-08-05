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
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { databaseHooks } from "./database-hooks";
import { hooks } from "./hooks";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const auth = betterAuth({
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

  hooks,

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
});
