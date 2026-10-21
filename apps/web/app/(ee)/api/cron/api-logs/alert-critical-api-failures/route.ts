import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { getCriticalApiFailures } from "@/lib/api-logs/get-critical-api-failures";
import { notifyCriticalApiFailures } from "@/lib/api-logs/notify-critical-api-failures";
import { withCron } from "@/lib/cron/with-cron";
import { TZDate } from "@date-fns/tz";
import { startOfHour, subHours } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/api-logs/alert-critical-api-failures
// Runs every hour (0 * * * *) — alerts workspace owners when critical
// conversion routes fail with 401/403 and no successful responses.
export const GET = withCron(async () => {
  const previousHour = startOfHour(subHours(new TZDate(Date.now(), "UTC"), 1));
  const hour = formatUTCDateTimeClickhouse(previousHour).slice(0, 19);

  const rows = await getCriticalApiFailures({ hour });

  if (rows.length === 0) {
    return logAndRespond(`No critical API failures for hour ${hour}.`);
  }

  const { workspacesNotified, emailsQueued } = await notifyCriticalApiFailures({
    hour: previousHour,
    rows,
  });

  return logAndRespond({
    hour,
    failureRows: rows.length,
    workspacesNotified,
    emailsQueued,
  });
});
