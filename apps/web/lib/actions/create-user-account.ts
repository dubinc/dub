"use server";

import { prisma } from "@/lib/prisma";
import { ratelimit, redis } from "@/lib/upstash";
import { flattenValidationErrors } from "next-safe-action";
import { getIP } from "../api/utils";
import { hashPassword } from "../auth/password";
import z from "../zod";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./middlewares/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = signUpSchema.extend({
  code: z.string().min(6, "OTP must be 6 characters long."),
});

// Sign up a new user using email and password
export const createUserAccountAction = actionClient
  .schema(schema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, password, code } = parsedInput;

    console.log("createUserAccountAction", { email, password, code });

    const { success } = await ratelimit(2, "1 m").limit(`signup:${getIP()}`);

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    const disposableEmailDomains = await redis.smembers(
      "disposableEmailDomains",
    );

    if (disposableEmailDomains.includes(email.split("@")[1])) {
      throw new Error(
        "Disposable email addresses are not allowed. If you think this is a mistake, please contact us at support@dub.co",
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
          email,
          passwordHash: await hashPassword(password),
          emailVerified: new Date(),
        },
      });
    }

    return { ok: true };
  });
