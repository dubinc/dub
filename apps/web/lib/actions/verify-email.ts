"use server";

import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { flattenValidationErrors } from "next-safe-action";
import { getIP } from "../api/utils";
import { verifyEmailSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./middlewares/throw-if-authenticated";
import { actionClient } from "./safe-action";

// Verify email using OTP
export const verifyEmailAction = actionClient
  .schema(verifyEmailSchema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, code } = parsedInput;

    const { success, reset } = await ratelimit(3, "1 m").limit(
      `verifyEmail:${getIP()}`,
    );

    if (!success) {
      const millis = reset - Date.now();
      const timeToWait = Math.floor(millis / 1000);

      throw new Error(
        `You have been rate limited. Please try again in ${timeToWait} seconds.`,
      );
    }

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: {
        identifier: email,
        token: code,
        expires: {
          gte: new Date(),
        },
      },
    });

    if (!verificationToken) {
      throw new Error("Invalid verification code entered.");
    }

    await Promise.all([
      prisma.emailVerificationToken.delete({
        where: {
          token: code,
        },
      }),

      prisma.user.update({
        where: {
          email,
        },
        data: {
          emailVerified: new Date(),
        },
      }),
    ]);

    return { ok: true };
  });
