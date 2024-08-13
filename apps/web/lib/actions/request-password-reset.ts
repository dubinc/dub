"use server";

import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { randomBytes } from "crypto";
import { sendEmail } from "emails";
import ResetPasswordLink from "emails/reset-password-link";
import { flattenValidationErrors } from "next-safe-action";
import { PASSWORD_RESET_TOKEN_EXPIRY } from "../auth/constants";
import { requestPasswordResetSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./middlewares/throw-if-authenticated";
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

    // Check user with email exists
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new Error("An user with this email does not exist.");
    }

    const { token } = await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: randomBytes(32).toString("hex"),
        expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY * 1000),
      },
    });

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
