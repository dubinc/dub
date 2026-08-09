import {
  deleteExpiredSessions,
  deleteExpiredVerifications,
} from "@/lib/better-auth/cleanup-expired";
import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// Deletes expired Better Auth Session and Verification rows.
// Runs once every day at 02:00:00 AM UTC (0 2 * * *) via QStash.
// POST /api/cron/auth/cleanup-expired
export const POST = withCron(async () => {
  const cutoff = new Date();

  const [deletedSessions, deletedVerifications] = await Promise.all([
    deleteExpiredSessions(cutoff),
    deleteExpiredVerifications(cutoff),
  ]);

  return logAndRespond({
    deletedSessions,
    deletedVerifications,
  });
});
