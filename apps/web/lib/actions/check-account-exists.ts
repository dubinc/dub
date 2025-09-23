"use server";

import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_HOSTNAMES } from "@dub/utils";
import { getIP } from "../api/utils";
import { isGenericEmail } from "../emails";
import z from "../zod";
import { emailSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = z.object({
  email: emailSchema,
});

// Check if account exists
export const checkAccountExistsAction = actionClient
  .schema(schema)
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success } = await ratelimit(8, "1 m").limit(
      `account-exists:${getIP()}`,
    );

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    // Check SAML enforcement
    const hostname = new URL(process.env.NEXTAUTH_URL as string).hostname;
    const emailDomain = email.split("@")[1];
    const shouldCheckSAML = APP_HOSTNAMES.has(hostname) && !isGenericEmail(emailDomain);

    // Run both queries in parallel
    const [user, workspace] = await Promise.all([
      // Find the user
      prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          passwordHash: true,
        },
      }),
      // Check SAML enforcement (only if needed)
      shouldCheckSAML
        ? prisma.project.findUnique({
            where: {
              ssoEmailDomain: emailDomain,
            },
            select: {
              ssoEnforcedAt: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (workspace?.ssoEnforcedAt) {
      return {
        accountExists: !!user,
        hasPassword: !!user?.passwordHash,
        requireSAML: true,
      };
    }

    return {
      accountExists: !!user,
      hasPassword: !!user?.passwordHash,
      requireSAML: false,
    };
  });
