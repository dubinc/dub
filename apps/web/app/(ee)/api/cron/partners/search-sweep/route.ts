import { getPartnerSearchProvider } from "@/lib/api/partners/search";
import { withCron } from "@/lib/cron/with-cron";
import { partnerSearchSweepJob } from "@/lib/jobs/handlers/partner-search-sweep-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// Kicks off a full re-index of the partner search corpus, which the job then
// carries to completion by re-dispatching itself with a cursor.
//
// This is the backstop for call-site drift: a mutation path that never queued a
// sync, or one added by someone unaware the index exists, is corrected by the
// next pass rather than staying wrong indefinitely. The pass interval is
// therefore the worst-case staleness of any document.
//
// Runs once a week at 03:00 AM UTC on Sunday (0 3 * * 0)
// GET /api/cron/partners/search-sweep
export const GET = withCron(async () => {
  if (!getPartnerSearchProvider()) {
    return logAndRespond(
      "Partner search provider is not configured, skipping sweep.",
    );
  }

  // No cursor: every run starts a fresh pass rather than resuming an
  // interrupted one, so a stalled pass cannot wedge the schedule.
  await partnerSearchSweepJob.dispatch({});

  return logAndRespond("Partner search sweep started.");
});
