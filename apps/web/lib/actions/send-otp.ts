"use server";

import { ratelimit } from "@/lib/upstash";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
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

    const userExists = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, image: true },
    });

    if (userExists) {
      throw new Error("User with this email already exists");
    }

    const code = generateOTP();
    console.log("Verification code: ", code, " for email: ", email);
    await prisma.emailVerificationToken.deleteMany({
      where: {
        identifier: email,
      },
    });

    const customerId = await prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
      },
    });

    console.log("send otp");
    console.log("customerId", customerId);

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
        template: CUSTOMER_IO_TEMPLATES.SIGNUP_CODE,
        messageData: {
          code,
        },
        customerId: customerId?.id,
      }),
    ]);
  });
