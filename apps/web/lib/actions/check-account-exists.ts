"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import * as z from "zod/v4";
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

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.accountExistsCheck,
      identifier: await getIP(),
    });

    const [user, isSamlEnforced] = await Promise.all([
      prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          authAccounts: {
            where: {
              providerId: "credential",
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      }),

      isSamlEnforcedForEmailDomain(email),
    ]);

    return {
      accountExists: !!user,
      hasPassword: (user?.authAccounts.length ?? 0) > 0,
      requireSAML: isSamlEnforced,
    };
  });
