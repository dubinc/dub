"use server";

import { consumeEmailVerificationOtp } from "@/lib/auth/consume-email-verification-otp";
import { hashPassword } from "@/lib/auth/password";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { flattenValidationErrors } from "next-safe-action";
import { headers } from "next/headers";
import * as z from "zod/v4";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = signUpSchema.extend({
  code: z.string().min(6, "OTP must be 6 characters long."),
});

// Sign up a new user using email and password
export const createUserAccountAction = actionClient
  .inputSchema(schema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, password, code } = parsedInput;

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.signupOtpVerify,
      identifier: email,
    });

    const consumed = await consumeEmailVerificationOtp({
      identifier: email,
      token: code,
    });

    if (!consumed) {
      throw new Error("Invalid verification code entered.");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    // Don't expose if user already exists
    if (existingUser) {
      throw new Error("Invalid verification code entered.");
    }

    const ctx = await auth.$context;
    const passwordHash = await hashPassword(password);

    const user = await ctx.internalAdapter.createUser({
      email,
      name: "",
      emailVerified: true,
    });

    if (!user) {
      throw new Error("Failed to create user account.");
    }

    try {
      await ctx.internalAdapter.linkAccount({
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      });
    } catch (error) {
      await prisma.user
        .delete({
          where: {
            id: user.id,
          },
        })
        .catch(() => null);

      throw error;
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: new Date(),
        emailVerifiedBa: true,
      },
    });

    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });
  });
