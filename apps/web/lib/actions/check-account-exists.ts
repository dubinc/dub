"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { skipAuthThrottling } from "../api/environment";
import { isSamlEnforcedForEmailDomain } from "../api/workspaces/is-saml-enforced-for-email-domain";
import { emailSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = z.object({
  email: emailSchema,
});

// Check if account exists
export const checkAccountExistsAction = actionClient
  .inputSchema(schema)
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    if (!skipAuthThrottling) {
      const { success } = await ratelimit(8, "1 m").limit(
        `account-exists:${await getIP()}`,
      );

      if (!success) {
        throw new Error("Too many requests. Please try again later.");
      }
    }

    const [user, isSamlEnforced] = await Promise.all([
      prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          passwordHash: true,
        },
      }),

      isSamlEnforcedForEmailDomain(email),
    ]);

    return {
      accountExists: !!user,
      hasPassword: !!user?.passwordHash,
      requireSAML: isSamlEnforced,
    };
  });
