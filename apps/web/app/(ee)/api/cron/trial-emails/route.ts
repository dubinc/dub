import { withCron } from "@/lib/cron/with-cron";
import { runTrialEmailCron } from "@/lib/email/run-trial-email-cron";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

/**
 * Sends the paid-plan trial marketing sequence (see `lib/email/trial-email-schedule.ts`).
 * Runs on a schedule (cron). Eligibility is `trialEndsAt` in the future + `SentEmail` dedupe.
 *
 * Complements the generic welcome email (`/api/cron/welcome-user`): free-only signups get welcome only;
 * users who start a trial get welcome (QStash) + these emails when due.
 */

// GET /api/cron/trial-emails
export const GET = withCron(async () => {
  const now = new Date();
  const { sentCount, workspaceCount } = await runTrialEmailCron({ now, prisma });

  if (workspaceCount === 0) {
    return logAndRespond("No workspaces in active trial. Skipping.");
  }

  return logAndRespond(
    `Trial email cron completed. Sent ${sentCount} email(s) across ${workspaceCount} workspace(s).`,
  );
});
