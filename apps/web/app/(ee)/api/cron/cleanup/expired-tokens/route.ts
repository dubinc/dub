import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const PRISMA_DELETEMANY_LIMIT = 1000;

// This route is used to remove expired tokens from the database
// 1. VerificationToken
// 2. EmailVerificationToken
// 3. PasswordResetToken
// 4. RestrictedToken (workspace API keys expired 90+ days ago)
// Runs once every day at 02:00:00 AM UTC (0 2 * * *)
// POST /api/cron/cleanup/expired-tokens
export const POST = withCron(async () => {
  // Tokens expired 1 day ago
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24);

  const [
    verificationTokens,
    emailVerificationTokens,
    passwordResetTokens,
    restrictedTokens,
  ] = await Promise.all([
    prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: cutoff,
        },
      },
      limit: PRISMA_DELETEMANY_LIMIT,
    }),

    prisma.emailVerificationToken.deleteMany({
      where: {
        expires: {
          lt: cutoff,
        },
      },
      limit: PRISMA_DELETEMANY_LIMIT,
    }),

    prisma.passwordResetToken.deleteMany({
      where: {
        expires: {
          lt: cutoff,
        },
      },
      limit: PRISMA_DELETEMANY_LIMIT,
    }),

    prisma.restrictedToken.deleteMany({
      where: {
        installationId: null,
        expires: {
          lt: subDays(new Date(), 90),
        },
      },
      limit: PRISMA_DELETEMANY_LIMIT,
    }),
  ]);

  return logAndRespond(
    `Token cleanup deleted verificationTokens=${verificationTokens.count}, emailVerificationTokens=${emailVerificationTokens.count}, passwordResetTokens=${passwordResetTokens.count}, restrictedTokens=${restrictedTokens.count}`,
  );
});
