import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { PASSWORD_RESET_TOKEN_EXPIRY } from "@/lib/auth/constants";
import { getServerSession } from "@/lib/better-auth/get-session";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { requestPasswordResetSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import ResetPasswordLink from "@dub/email/templates/reset-password-link";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/forgot-password - request a password reset email
export async function POST(req: NextRequest) {
  try {
    const { session } = await getServerSession(req.headers);

    if (session) {
      throw new DubApiError({
        code: "bad_request",
        message: "You are already logged in.",
      });
    }

    const { email } = requestPasswordResetSchema.parse(
      await parseRequestBody(req),
    );

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.passwordResetRequest,
      identifier: email.toLowerCase(),
    });

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = randomBytes(32).toString("hex");

    // Run this sequentially to avoid race conditions
    await prisma.$transaction([
      // Remove old password reset tokens
      prisma.passwordResetToken.deleteMany({
        where: {
          identifier: email,
        },
      }),

      // Create a password reset token
      prisma.passwordResetToken.create({
        data: {
          identifier: email,
          token,
          expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY * 1000),
        },
      }),
    ]);

    await sendEmail({
      subject: "Dub: Password reset instructions",
      to: email,
      react: ResetPasswordLink({
        email,
        url: `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
