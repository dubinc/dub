import { withCron } from "@/lib/cron/with-cron";
import { welcomeUserJob } from "@/lib/jobs/handlers/welcome-user-job";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/welcome-user
export const POST = withCron(async ({ rawBody }) => {
  await welcomeUserJob.execute(JSON.parse(rawBody));
  return logAndRespond("Welcome email sent and user subscribed.");
});
