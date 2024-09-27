import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody, ratelimitOrThrow } from "@/lib/api/utils";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/zod/schemas/auth";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import PasswordUpdated from "emails/password-updated";
import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/reset-password - reset password using the reset token
export async function POST(req: NextRequest) {
  try {
    await ratelimitOrThrow(req, "reset-password");

    const { token, password } = resetPasswordSchema.parse(
      await parseRequestBody(req),
    );

    // Find the token
    const tokenFound = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expires: {
          gte: new Date(),
        },
      },
      select: {
        identifier: true,
      },
    });

    if (!tokenFound) {
      throw new DubApiError({
        code: "not_found",
        message:
          "Password reset token not found or expired. Please request a new one.",
      });
    }

    const { identifier } = tokenFound;

    await prisma.$transaction([
      // Delete the token
      prisma.passwordResetToken.deleteMany({
        where: {
          token,
        },
      }),

      // Update the user's password
      prisma.user.update({
        where: {
          email: identifier,
        },
        data: {
          passwordHash: await hashPassword(password),
          lockedAt: null, // Unlock the account after a successful password reset
        },
      }),
    ]);

    // Send the email to inform the user that their password has been reset
    waitUntil(
      sendEmail({
        subject: `Your ${process.env.NEXT_PUBLIC_APP_NAME} account password has been reset`,
        email: identifier,
        react: PasswordUpdated({
          email: identifier,
          verb: "reset",
        }),
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
