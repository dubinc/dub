import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// tokens expired 10+ mins ago
const cutoff = new Date(Date.now() - 1000 * 60 * 10);

// This route is used to remove expired tokens from the database
// 1. VerificationToken
// 2. EmailVerificationToken
// 3. PasswordResetToken
// Runs once every hour (0 * * * *)
// GET /api/cron/cleanup/expired-tokens
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const [verificationTokens, emailVerificationTokens, passwordResetTokens] =
      await Promise.all([
        prisma.verificationToken.deleteMany({
          where: {
            expires: {
              lt: cutoff,
            },
          },
        }),

        prisma.emailVerificationToken.deleteMany({
          where: {
            expires: {
              lt: cutoff,
            },
          },
        }),

        prisma.passwordResetToken.deleteMany({
          where: {
            expires: {
              lt: cutoff,
            },
          },
        }),
      ]);

    console.log("Token cleanup deleted", {
      verificationTokens: verificationTokens.count,
      emailVerificationTokens: emailVerificationTokens.count,
      passwordResetTokens: passwordResetTokens.count,
    });

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `/api/cron/cleanup/expired-tokens failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
