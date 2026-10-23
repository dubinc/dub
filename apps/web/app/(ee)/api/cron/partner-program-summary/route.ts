import { withCron } from "@/lib/cron/with-cron";
import { queuePartnerProgramSummaryJob } from "@/lib/jobs/handlers/queue-partner-program-summary-job";
import { format, startOfMonth, subMonths } from "date-fns";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// This route kicks off the monthly partner program summary emails.
// Scheduled to run at 1 PM UTC on the 1st day of every month to send the previous month's summary.
// GET /api/cron/partner-program-summary
export const GET = withCron(async () => {
  const yearMonth = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM");

  await queuePartnerProgramSummaryJob.dispatch(
    {
      yearMonth,
    },
    {
      deduplicationId: `queue-program-summary-${yearMonth}`,
    },
  );

  return logAndRespond(
    `Enqueued partner program summary queue job for ${yearMonth}.`,
  );
});
