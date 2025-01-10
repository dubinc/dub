"use server";

import { ratelimit } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import { ResetPasswordLink } from "@dub/email/templates/reset-password-link";
import { prisma } from "@dub/prisma";
import { randomBytes } from "crypto";
import { flattenValidationErrors } from "next-safe-action";
import { PASSWORD_RESET_TOKEN_EXPIRY } from "../auth/constants";
import { requestPasswordResetSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

// Request a password reset email
export const requestPasswordResetAction = actionClient
  .schema(requestPasswordResetSchema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success } = await ratelimit(2, "1 m").limit(
      `request-password-reset:${email.toLowerCase()}`,
    );

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString("hex");

    // Run this sequentially to avoid race conditions
    await prisma.$transaction([
      // Remove old password reset tokens
      prisma.passwordResetToken.deleteMany({
        where: {
          identifier: email,
        },
      }),

      // Create a new password reset token
      prisma.passwordResetToken.create({
        data: {
          identifier: email,
          token,
          expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY * 1000),
        },
      }),
    ]);

    await sendEmail({
      subject: `${process.env.NEXT_PUBLIC_APP_NAME}: Password reset instructions`,
      email,
      react: ResetPasswordLink({
        email,
        url: `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`,
      }),
    });

    return { ok: true };
  });
