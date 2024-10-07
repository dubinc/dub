"use server";

import { prisma } from "@/lib/prisma";
import { ratelimit, redis } from "@/lib/upstash";
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

    const domain = email.split("@")[1];
    const isDisposable = await redis.sismember(
      "disposableEmailDomains",
      domain,
    );

    if (isDisposable) {
      throw new Error(
        "Disposable email addresses are not allowed. If you think this is a mistake, please contact us at support@dub.co",
      );
    }

    if (email.includes("+") && email.endsWith("@gmail.com")) {
      throw new Error(
        "Email addresses with + are not allowed. Please use your work email instead.",
      );
    }

    const code = generateOTP();

    await prisma.emailVerificationToken.deleteMany({
      where: {
        identifier: email,
      },
    });

    await Promise.all([
      prisma.emailVerificationToken.create({
        data: {
          identifier: email,
          token: code,
          expires: new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000),
        },
      }),
      sendEmail({
        subject: `${process.env.NEXT_PUBLIC_APP_NAME}: OTP to verify your account`,
        email,
        react: VerifyEmail({
          email,
          code,
        }),
      }),
    ]);

    return { ok: true };
  });
