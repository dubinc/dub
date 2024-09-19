"use server";

import { prisma } from "@/lib/prisma";
import { ratelimit, redis } from "@/lib/upstash";
import { sendEmail } from "emails";
import VerifyEmail from "emails/verify-email";
import { flattenValidationErrors } from "next-safe-action";
import { getIP } from "../api/utils";
import { generateOTP } from "../auth";
import { EMAIL_OTP_EXPIRY_IN } from "../auth/constants";
import { hashPassword } from "../auth/password";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./middlewares/throw-if-authenticated";
import { actionClient } from "./safe-action";

// Sign up a new user using email and password
export const createUserAccountAction = actionClient
  .schema(signUpSchema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput, ctx }) => {
    const { email, password } = parsedInput;

    const { success } = await ratelimit(2, "1 m").limit(`signup:${getIP()}`);

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    // Check user with email exists
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      throw new Error("An user with this email already exists.");
    }

    if (await redis.sismember("disposableEmailDomains", email.split("@")[1])) {
      throw new Error(
        "Disposable email addresses are not allowed. If you think this is a mistake, please contact us at support@dub.co",
      );
    }

    // Create an account
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
      },
    });

    if (!newUser) {
      throw new Error("Failed to create an account. Please try again.");
    }

    // Generate the OTP
    const code = generateOTP();

    await prisma.emailVerificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires: new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000),
      },
    });

    // Send email with generated OTP
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
