import { getPartnerSearchProvider } from "@/lib/api/partners/search";
import { withCron } from "@/lib/cron/with-cron";
import { partnerSearchSweepJob } from "@/lib/jobs/handlers/partner-search-sweep-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// Runs weekly at 03:00 UTC on Sunday (0 3 * * 0)
// GET /api/cron/partners/search-sweep
export const GET = withCron(async () => {
  if (!getPartnerSearchProvider()) {
    return logAndRespond(
      "Partner search provider is not configured, skipping sweep.",
    );
  }

  // A fresh pass each run, so a stalled one cannot wedge the schedule
  await partnerSearchSweepJob.dispatch({});

  return logAndRespond("Partner search sweep started.");
});
