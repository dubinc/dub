import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { PASSWORD_RESET_TOKEN_EXPIRY } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail } from "emails";
import ResetPasswordLink from "emails/reset-password-link";
import { NextResponse } from "next/server";

// POST /api/user/set-password - set account password (for users who signed up with a OAuth provider)
export const POST = withSession(async ({ session }) => {
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      isMachine: false,
      passwordHash: null,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "You already have a password set. You can change it in your account settings.",
    });
  }

  const { token } = await prisma.passwordResetToken.create({
    data: {
      identifier: session.user.email,
      token: randomBytes(32).toString("hex"),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY * 1000),
    },
  });

  // Send email with password reset link
  await sendEmail({
    subject: `${process.env.NEXT_PUBLIC_APP_NAME}: Password reset instructions`,
    email: session.user.email,
    react: ResetPasswordLink({
      email: session.user.email,
      url: `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`,
    }),
  });

  if (process.env.NODE_ENV === "development") {
    console.info(
      "Password reset URL:",
      `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`,
    );
  }

  return NextResponse.json({ ok: true });
});
