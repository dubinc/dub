import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { isSamlEnforcedForEmailDomain } from "@/lib/api/workspaces/is-saml-enforced-for-email-domain";
import { EMAIL_OTP_EXPIRY_IN } from "@/lib/auth/constants";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { sendEmail } from "@dub/email";
import VerifyEmail from "@dub/email/templates/verify-email";
import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { databaseHooks } from "./database-hooks";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

const SIGN_IN_PATHS = new Set([
  "/sign-in/email",
  "/sign-in/email-otp",
  "/email-otp/send-verification-otp",
]);

async function enforceSignInGuards(email: string, path: string) {
  const isOtpSend = path === "/email-otp/send-verification-otp";

  try {
    await assertRateLimit({
      policy: isOtpSend
        ? RATELIMIT_POLICIES.loginLinkSend
        : RATELIMIT_POLICIES.login,
      identifier: email,
    });
  } catch (error) {
    if (error instanceof DubApiError) {
      throw new APIError("TOO_MANY_REQUESTS", {
        message: error.message,
      });
    }
    throw error;
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
  emailAndPassword: {
    enabled: true,
    // OTP already proved ownership before we call signUpEmail
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 1000,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => {
        return await validatePassword({
          password,
          passwordHash: hash,
        });
      },
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
      if (!SIGN_IN_PATHS.has(ctx.path)) {
        return;
      }

      const email =
        typeof ctx.body?.email === "string" ? ctx.body.email : undefined;

      if (!email) {
        return;
      }

      await enforceSignInGuards(email, ctx.path);
    }),
  },
  databaseHooks,
  plugins: [
    // BA plugin AuthContext generic variance (emailOTP init vs BetterAuthPlugin)
    // @ts-expect-error — keep plugin typed so auth.api.signInEmailOTP infers; do not cast `as any`
    emailOTP({
      otpLength: 6,
      expiresIn: EMAIL_OTP_EXPIRY_IN,
      allowedAttempts: 5,
      disableSignUp: true, // login only — never auto-create users
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") {
          return;
        }

        waitUntil(
          sendEmail({
            to: email,
            subject: "Your Dub login code",
            react: VerifyEmail({
              email,
              code: otp,
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
