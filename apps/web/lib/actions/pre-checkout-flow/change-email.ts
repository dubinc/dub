"use server";

import { actionClient } from "@/lib/actions/safe-action";
import z from "@/lib/zod";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { prisma } from "@dub/prisma";
import {
  getUserCookieService,
  updateUserCookieService,
} from "core/services/cookie/user-session.service";
import { encodeUserMarketingToken } from "core/services/user-marketing-token.service";
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
  signupMethod: z.enum(["email", "google"]).optional(),
});

// Sign up a new user using email and password
export const changePreSignupEmailAction = actionClient
  .schema(schema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, signupMethod } = parsedInput;

    const { sessionId, isPaidTraffic } = await getUserCookieService();

    const dbUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        email: true,
      },
    });

    await updateUserCookieService({ email });

    const userToken = encodeUserMarketingToken({
      id: sessionId!,
      email,
      isPaidUser: isPaidTraffic || false,
    });

    return { success: true, userToken, signupMethod, email };

    // CustomerIOClient.identify(generatedUserId, {
    //     email,
    //     env:
    //       !process.env.NEXT_PUBLIC_APP_ENV ||
    //       process.env.NEXT_PUBLIC_APP_ENV === "dev"
    //         ? "development"
    //         : undefined,
    //   }),
  });
