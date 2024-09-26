"use server";

import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { sendEmail } from "emails";
import VerifyEmail from "emails/verify-email";
import { flattenValidationErrors } from "next-safe-action";
import { getIP } from "../api/utils";
import { generateOTP } from "../auth";
import { EMAIL_OTP_EXPIRY_IN } from "../auth/constants";
import z from "../zod";
import { emailSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = z.object({
  email: emailSchema,
});

// Send OTP to email to verify account
export const sendOtpAction = actionClient
  .schema(schema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success } = await ratelimit(2, "1 m").limit(`send-otp:${getIP()}`);

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    const code = generateOTP();

    await Promise.all([
      prisma.emailVerificationToken.deleteMany({
        where: {
          identifier: email,
        },
      }),

      prisma.emailVerificationToken.create({
        data: {
          identifier: email,
          token: code,
          expires: new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000),
        },
      }),
    ]);

    await sendEmail({
      subject: `${process.env.NEXT_PUBLIC_APP_NAME}: OTP to verify your account`,
      email,
      react: VerifyEmail({
        email,
        code,
      }),
    });

    return { ok: true };
  });
