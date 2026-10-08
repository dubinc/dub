import { withCron } from "@/lib/cron/with-cron";
import { programApplicationReminderJob } from "@/lib/jobs/handlers/program-application-reminder-job";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// POST - /api/cron/program-application-reminder
// Sends an email to a program application email if they haven't verified their account on Dub yet
// TODO: Remove this route once in-flight QStash messages to this URL have drained (~3 days after deploy)
export const POST = withCron(async ({ rawBody }) => {
  await programApplicationReminderJob.execute(JSON.parse(rawBody));
  return logAndRespond("Program application reminder processed.");
});
