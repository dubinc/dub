"use server";

import { prisma } from "@/lib/prisma";
import { flattenValidationErrors } from "next-safe-action";
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

    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier: email,
        token: code,
        expires: {
          gte: new Date(),
        },
      },
    });

    if (!verificationToken) {
      throw new Error("Incorrect code.");
    }

    await Promise.all([
      prisma.verificationToken.delete({
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

    return {
      status: "ok",
    };
  });
