import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody, ratelimitOrThrow } from "@/lib/api/utils";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import { PasswordUpdated } from "@dub/email/templates/password-updated";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
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

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email: identifier,
      },
      select: {
        emailVerified: true,
      },
    });

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
          ...(!user.emailVerified && { emailVerified: new Date() }), // Mark the email as verified
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
