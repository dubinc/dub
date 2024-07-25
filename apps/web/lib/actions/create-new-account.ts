"use server";

import { prisma } from "@/lib/prisma";
import { flattenValidationErrors } from "next-safe-action";
import { hashPassword } from "../auth/password";
import { signUpSchema } from "../zod/schemas/auth";
import { actionClient } from "./safe-action";

// Sign up a new user using email and password
export const createNewAccount = actionClient
  .schema(signUpSchema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;

    // Check user with email exists
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      throw new Error("An user with this email already exists.");
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

    // TODO:
    // Send verification email

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    };
  });
