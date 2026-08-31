import { withCron } from "@/lib/cron/with-cron";
import { cleanupPublishedJobs } from "@/lib/jobs/cleanup-jobs";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

// Deletes published Job rows older than 24 hours so the outbox does not grow unbounded.
// Runs once every day at 02:00:00 AM UTC (0 2 * * *)
// GET /api/cron/queue/cleanup
export const GET = withCron(async () => {
  const { deletedCount } = await cleanupPublishedJobs();

  if (deletedCount === 0) {
    return logAndRespond("No published jobs older than 24 hours to delete.");
  }

  return logAndRespond(
    `Deleted ${deletedCount} published jobs older than 24 hours.`,
  );
});
