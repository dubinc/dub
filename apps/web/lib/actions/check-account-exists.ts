"use server";

import { z } from "zod";
import { isWhitelistedEmail } from "../edge-config";
import { prisma } from "../prisma";
import { actionClient } from "./safe-action";

// Check if an account exists
export const checkAccountExists = actionClient
  .schema(
    z.object({
      email: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        email: true,
        passwordHash: true,
      },
    });

    console.log("user", user);

    if (!user) {
      const whitelisted = await isWhitelistedEmail(email);
      if (whitelisted) {
        return {
          accountExists: true,
          hasPassword: false,
        };
      } else {
        return {
          accountExists: false,
          hasPassword: false,
        };
      }
    }

    return {
      accountExists: true,
      hasPassword: !!user.passwordHash,
    };
  });
