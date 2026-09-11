import { withCron } from "@/lib/cron/with-cron";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/links/invalidate-for-discounts
export const POST = withCron(async ({ rawBody }) => {
  await invalidateLinksForDiscountsJob.execute(JSON.parse(rawBody));

  return logAndRespond("Expired partner link cache for discounts.");
});
