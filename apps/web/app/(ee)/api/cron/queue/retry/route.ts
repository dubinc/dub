import { withCron } from "@/lib/cron/with-cron";
import { publishPendingJobs } from "@/lib/jobs/publish-jobs";
import { redis } from "@/lib/upstash/redis";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// Lock for the cron job. TTL must be ≥ cron maxDuration (600s in vercel.json)
// so the lock cannot expire while a run is still alive and allow a concurrent
// minute-cron invocation
const LOCK_KEY = "lock:queue-retry";
const LOCK_TTL_SECONDS = 600;

// GET /api/cron/queue/retry – republish background jobs that failed to
// publish to QStash at dispatch time; rows are marked published on success
export const GET = withCron(async () => {
  const acquired = await redis.set(LOCK_KEY, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    return logAndRespond(
      "[queue-retry] Another run is in progress. Skipping...",
    );
  }

  try {
    const { attempted, published, failed } = await publishPendingJobs();

    if (attempted === 0) {
      return logAndRespond("No background jobs to retry.");
    }

    if (failed === 0) {
      return logAndRespond(
        `Republished ${published} background jobs to QStash.`,
      );
    }

    return logAndRespond(
      `Republished ${published} background jobs to QStash; failed to republish ${failed}.`,
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
});
