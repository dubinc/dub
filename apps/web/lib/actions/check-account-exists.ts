"use server";

import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_HOSTNAMES } from "@dub/utils";
import { headers } from "next/headers";
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
    const hostname = headers().get("host");
    const emailDomain = email.split("@")[1];
    const shouldCheckSAML =
      hostname && APP_HOSTNAMES.has(hostname) && !isGenericEmail(email);

    const [user, workspace] = await Promise.all([
      prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          passwordHash: true,
        },
      }),

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

    return {
      accountExists: !!user,
      hasPassword: !!user?.passwordHash,
      requireSAML: !!workspace?.ssoEnforcedAt,
    };
  });
