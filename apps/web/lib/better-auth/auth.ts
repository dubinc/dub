import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { databaseHooks } from "./database-hooks";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  user: {
    modelName: "user",
    fields: {
      emailVerified: "emailVerifiedBa",
    },
    additionalFields: {
      isMachine: {
        type: "boolean",
        required: false,
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
  plugins: [nextCookies()],
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
