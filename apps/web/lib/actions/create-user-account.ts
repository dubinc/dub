"use server";

import { ratelimit, redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { generateRandomString } from "@dub/utils/src";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
import { flattenValidationErrors } from "next-safe-action";
import { createId, getIP } from "../api/utils";
import { hashPassword } from "../auth/password";
import z from "../zod";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
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

    const { success } = await ratelimit(2, "1 m").limit(`signup:${getIP()}`);

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
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
      const generatedUserId = createId({ prefix: "user_" });

      await prisma.user.create({
        data: {
          id: generatedUserId,
          email,
          passwordHash: await hashPassword(password),
          emailVerified: new Date(),
        },
      });

      // @CUSTOM_FEATURE: creation of a workspace immediately after registration to skip onboarding
      const workspaceResponse = await prisma.project.create({
        data: {
          name: email,
          slug: slugify(email),
          users: {
            create: {
              userId: generatedUserId,
              role: "owner",
              notificationPreference: {
                create: {},
              },
            },
          },
          billingCycleStart: new Date().getDate(),
          invoicePrefix: generateRandomString(8),
          inviteCode: nanoid(24),
          defaultDomains: {
            create: {},
          },
        },
        include: {
          users: {
            where: {
              userId: generatedUserId,
            },
            select: {
              role: true,
            },
          },
          domains: {
            select: {
              slug: true,
              primary: true,
            },
          },
        },
      });

      await prisma.user.update({
        where: {
          id: generatedUserId,
        },
        data: {
          defaultWorkspace: workspaceResponse.slug,
        },
      });

      await redis.set(`onboarding-step:${generatedUserId}`, "completed");
    }
  });
