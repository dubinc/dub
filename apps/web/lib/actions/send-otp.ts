"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { ratelimit, redis } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import VerifyEmail from "@dub/email/templates/verify-email";
import { prisma } from "@dub/prisma";
import { get } from "@vercel/edge-config";
import { flattenValidationErrors } from "next-safe-action";
import { generateOTP } from "../auth";
import { EMAIL_OTP_EXPIRY_IN } from "../auth/constants";
import { isGenericEmail } from "../is-generic-email";
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
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success } = await ratelimit(2, "1 m").limit(
      `send-otp:${email}:${await getIP()}`,
    );

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    if (email.includes("+") && isGenericEmail(email)) {
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

      // Only build the regex if we have at least one term; otherwise set to null
      const blacklistedEmailDomainTermsRegex =
        emailDomainTerms && Array.isArray(emailDomainTerms)
          ? new RegExp(
              emailDomainTerms
                .map((term: string) =>
                  term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                ) // replace special characters with escape sequences
                .join("|"),
            )
          : null;

      if (
        isDisposable ||
        (blacklistedEmailDomainTermsRegex &&
          blacklistedEmailDomainTermsRegex.test(domain))
      ) {
        // edge case: the user already has a partner account on Dub with this email address,
        // or they have an existing application for a program, we can allow them to continue
        const [isPartnerAccount, hasExistingApplications] = await Promise.all([
          prisma.partner.findUnique({
            where: {
              email,
            },
          }),
          prisma.programApplication.findFirst({
            where: {
              email,
            },
          }),
        ]);
        if (!isPartnerAccount && !hasExistingApplications) {
          throw new Error(
            "Invalid email address – please use your work email instead. If you think this is a mistake, please contact us at support@dub.co",
          );
        }
      }
    }

    const isExistingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isExistingUser) {
      throw new Error(
        "User already exists. Please login instead of requesting a new OTP.",
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
        to: email,
        react: VerifyEmail({
          email,
          code,
        }),
      }),
    ]);
  });
