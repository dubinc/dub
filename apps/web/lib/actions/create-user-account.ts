"use server";

import { hashPassword } from "@/lib/auth/password";
import { auth } from "@/lib/better-auth/auth";
import {
  consumeVerificationToken,
  deleteVerificationTokens,
  findVerificationToken,
} from "@/lib/better-auth/verification-token";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { waitUntil } from "@vercel/functions";
import { flattenValidationErrors } from "next-safe-action";
import { headers } from "next/headers";
import * as z from "zod/v4";
import { shouldApplyRateLimit } from "../api/environment";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = signUpSchema.extend({
  code: z.string().min(6, "OTP must be 6 characters long."),
});

const MAX_OTP_ATTEMPTS = 5; // Block after 5 failed attempts
const OTP_LOCKOUT_DURATION = "24 h"; // Block for 24 hours

// Sign up a new user using email and password
export const createUserAccountAction = actionClient
  .inputSchema(schema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, password, code } = parsedInput;

    const signupAttemptKey = `signup:attempts:${email}`;

    if (shouldApplyRateLimit) {
      const { remaining: attemptsRemaining } = await ratelimit(
        MAX_OTP_ATTEMPTS,
        OTP_LOCKOUT_DURATION,
      ).getRemaining(signupAttemptKey);

      if (attemptsRemaining <= 0) {
        throw new Error(
          "Too many failed attempts. You have to try again later.",
        );
      }
    }

    const verification = await findVerificationToken({
      kind: "signupOtp",
      identifier: email,
    });

    if (
      !verification ||
      verification.value.code !== code ||
      verification.value.targetEmail !== email
    ) {
      await ratelimit(MAX_OTP_ATTEMPTS, OTP_LOCKOUT_DURATION).limit(
        signupAttemptKey,
      );

      throw new Error("Invalid verification code entered.");
    }

    if (verification.isExpired) {
      waitUntil(
        deleteVerificationTokens({
          kind: "signupOtp",
          identifier: email,
        }),
      );

      throw new Error("The OTP has expired. Please request a new one.");
    }

    const consumed = await consumeVerificationToken({
      kind: "signupOtp",
      identifier: email,
    });

    if (!consumed) {
      throw new Error("The OTP has expired. Please request a new one.");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        accounts: {
          where: {
            providerId: "credential",
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (existingUser) {
      throw new Error(
        "User already exists. Please login instead of requesting a new OTP.",
      );
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
