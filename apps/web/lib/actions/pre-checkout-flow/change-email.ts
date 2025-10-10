"use server";

import { actionClient } from "@/lib/actions/safe-action";
import z from "@/lib/zod";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { prisma } from "@dub/prisma";
import { updateUserCookieService } from "core/services/cookie/user-session.service";
import { flattenValidationErrors } from "next-safe-action";
import { throwIfAuthenticated } from "../auth/throw-if-authenticated";

class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "AuthError";
  }
}

const schema = z.object({
  email: emailSchema,
});

// Sign up a new user using email and password
export const changePreSignupEmailAction = actionClient
  .schema(schema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        email: true,
      },
    });

    if (user) {
      throw new AuthError(
        "email-exists",
        "User with this email already exists",
      );
    }

    await updateUserCookieService({ email });

    return { success: true };

    // CustomerIOClient.identify(generatedUserId, {
    //     email,
    //     env:
    //       !process.env.NEXT_PUBLIC_APP_ENV ||
    //       process.env.NEXT_PUBLIC_APP_ENV === "dev"
    //         ? "development"
    //         : undefined,
    //   }),
  });
