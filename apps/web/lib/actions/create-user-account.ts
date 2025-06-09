"use server";

import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { flattenValidationErrors } from "next-safe-action";
import { createId } from "../api/create-id";
import { hashPassword } from "../auth/password";
import z from "../zod";
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
  .schema(schema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, password, code } = parsedInput;

    const signupAttemptKey = `signup:attempts:${email}`;

    const { remaining: attemptsRemaining } = await ratelimit(
      MAX_OTP_ATTEMPTS,
      OTP_LOCKOUT_DURATION,
    ).getRemaining(signupAttemptKey);

    if (attemptsRemaining <= 0) {
      throw new Error("Too many failed attempts. You have to try again later.");
    }

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: {
        identifier: email,
        token: code,
      },
    });

    if (!verificationToken) {
      await ratelimit(MAX_OTP_ATTEMPTS, OTP_LOCKOUT_DURATION).limit(
        signupAttemptKey,
      );

      throw new Error("Invalid verification code entered.");
    }

    if (verificationToken.expires && verificationToken.expires < new Date()) {
      waitUntil(
        prisma.emailVerificationToken.delete({
          where: {
            identifier: email,
            token: code,
          },
        }),
      );

      throw new Error("The OTP has expired. Please request a new one.");
    }

    await prisma.emailVerificationToken.delete({
      where: {
        identifier: email,
        token: code,
      },
    });

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      await prisma.user.create({
        data: {
          id: createId({ prefix: "user_" }),
          email,
          passwordHash: await hashPassword(password),
          emailVerified: new Date(),
        },
      });
    }
  });
