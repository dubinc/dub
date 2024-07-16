import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/zod/schemas/password";
import { sendEmail } from "emails";
import PasswordUpdated from "emails/password-updated";
import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/reset-password - reset password using the reset token
export async function POST(req: NextRequest) {
  try {
    const { token, password } = resetPasswordSchema.parse(
      await parseRequestBody(req),
    );

    // Find the token
    const tokenFound = await prisma.verificationToken.findFirst({
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
      prisma.verificationToken.deleteMany({
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
          emailVerified: new Date(),
        },
      }),
    ]);

    // Send the email to inform the user that their password has been updated
    await sendEmail({
      subject: `${process.env.NEXT_PUBLIC_APP_NAME}: Your password has been reset`,
      email: identifier,
      react: PasswordUpdated({
        email: identifier,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
