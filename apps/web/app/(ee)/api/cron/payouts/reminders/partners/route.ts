import { withCron } from "@/lib/cron/with-cron";
import { sendConnectPayoutRemindersJob } from "@/lib/jobs/handlers/send-connect-payout-reminders-job";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

// This route is used to send reminders to partners who have pending payouts
// but haven't configured payouts yet.
// Runs once a day at 7AM PST but only notifies partners every 3 days.
// Further batches are dispatched by sendConnectPayoutRemindersJob.
// GET /api/cron/payouts/reminders/partners
export const GET = withCron(async () => {
  await sendConnectPayoutRemindersJob.dispatch({});

  return logAndRespond("Enqueued connect payout reminders job.");
});
