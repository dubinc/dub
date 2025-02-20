"use server";

import { ratelimit, redis } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import { VerifyEmail } from "@dub/email/templates/verify-email";
import { prisma } from "@dub/prisma";
import { get } from "@vercel/edge-config";
import { flattenValidationErrors } from "next-safe-action";
import { getIP } from "../api/utils";
import { generateOTP } from "../auth";
import { EMAIL_OTP_EXPIRY_IN } from "../auth/constants";
import z from "../zod";
import { emailSchema, passwordSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
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

    if (email.includes("+") && email.endsWith("@gmail.com")) {
      throw new Error(
        "Email addresses with + are not allowed. Please use your work email instead.",
      );
    }

    const domain = email.split("@")[1];

    if (process.env.NEXT_PUBLIC_IS_DUB) {
      const [isDisposable, emailDomainTerms] = await Promise.all([
        redis.sismember("disposableEmailDomains", domain),
        process.env.EDGE_CONFIG ? get("emailDomainTerms") : [],
      ]);

      if (isDisposable) {
        throw new Error(
          "Invalid email address – please use your work email instead. If you think this is a mistake, please contact us at support@dub.co",
        );
      }

      if (emailDomainTerms && Array.isArray(emailDomainTerms)) {
        const blacklistedEmailDomainTermsRegex = new RegExp(
          emailDomainTerms
            .map((term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) // replace special characters with escape sequences
            .join("|"),
        );

        if (blacklistedEmailDomainTermsRegex.test(domain)) {
          throw new Error(
            "Invalid email address – please use your work email instead. If you think this is a mistake, please contact us at support@dub.co",
          );
        }
      }
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
  });
