import { withCron } from "@/lib/cron/with-cron";
import { autoApprovePartnerJob } from "@/lib/jobs/handlers/auto-approve-partner-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/partners/auto-approve
export const POST = withCron(async ({ rawBody }) => {
  await autoApprovePartnerJob.execute(JSON.parse(rawBody));
  return logAndRespond("Successfully auto-approved partner.");
});
