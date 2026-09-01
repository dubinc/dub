import { withCron } from "@/lib/cron/with-cron";
import { autoRejectPartnerJob } from "@/lib/jobs/handlers/auto-reject-partner-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/partners/auto-reject
export const POST = withCron(async ({ rawBody }) => {
  await autoRejectPartnerJob.execute(JSON.parse(rawBody));
  return logAndRespond("Successfully auto-rejected partner.");
});
