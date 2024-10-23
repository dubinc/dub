import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withSession } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { prisma } from "@dub/prisma";
import { updatePasswordSchema } from "@/lib/zod/schemas/auth";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import PasswordUpdated from "emails/password-updated";
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

  // Send the email to inform the user that their password has been updated
  waitUntil(
    sendEmail({
      subject: `Your ${process.env.NEXT_PUBLIC_APP_NAME} account password has been updated`,
      email: session.user.email,
      react: PasswordUpdated({
        email: session.user.email,
      }),
    }),
  );

  return NextResponse.json({ ok: true });
});
