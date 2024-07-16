import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withSession } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { updatePasswordSchema } from "@/lib/zod/schemas/password";
import { NextResponse } from "next/server";

// PATCH /api/user/password - updates the user's password
export const PATCH = withSession(async ({ req, session }) => {
  const { currentPassword, newPassword } = updatePasswordSchema.parse(
    await parseRequestBody(req),
  );

  const { passwordHash } = await prisma.user.findUniqueOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!passwordHash) {
    throw new DubApiError({
      code: "bad_request",
      message: "You don't have a password set. Please set a password first.",
    });
  }

  const passwordMatch = await validatePassword({
    password: currentPassword,
    passwordHash,
  });

  if (!passwordMatch) {
    throw new DubApiError({
      code: "unauthorized",
      message: "The password you entered is incorrect.",
    });
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  });

  // TODO:
  // Send an email to the user notifying them that their password has been updated

  return NextResponse.json({ ok: true });
});
