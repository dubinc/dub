import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const PRISMA_DELETEMANY_LIMIT = 2000;

// This route is used to remove expired tokens from the database
// 1. VerificationToken
// 2. EmailVerificationToken
// 3. PasswordResetToken
// 4. RestrictedToken (workspace API keys expired 90+ days ago)
// 5. Orphaned machine users left after those keys are hard-deleted
// Runs once every day at 02:00:00 AM UTC (0 2 * * *)
// POST /api/cron/cleanup/expired-tokens
export const POST = withCron(async () => {
  const now = new Date();
  const cutoff = subDays(now, 1);
  const restrictedTokenCutoff = subDays(now, 90);

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
          lt: restrictedTokenCutoff,
        },
      },
      limit: PRISMA_DELETEMANY_LIMIT,
    }),
  ]);

  // Machine API keys keep their User row while the soft-expired RestrictedToken
  // is retained (required userId FK). After hard-delete above, remove machine
  // users that no longer have any tokens or workspace memberships.
  const machineUsers = await prisma.user.deleteMany({
    where: {
      isMachine: true,
      projects: { none: {} },
      restrictedTokens: { none: {} },
    },
    limit: PRISMA_DELETEMANY_LIMIT,
  });

  return logAndRespond(
    `Token cleanup deleted verificationTokens=${verificationTokens.count}, emailVerificationTokens=${emailVerificationTokens.count}, passwordResetTokens=${passwordResetTokens.count}, restrictedTokens=${restrictedTokens.count}, machineUsers=${machineUsers.count}`,
  );
});
