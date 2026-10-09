import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@/lib/prisma";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

interface PayoutsTimeseries {
  start: string;
  payouts: number;
}

// Mirrors how `payoutsUsage` is tracked: incremented when a payout invoice is
// created (processing) and decremented if the charge fails
export async function getPayoutsTimeseries({
  workspaceId,
  startDate,
  endDate,
  timezone,
}: {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
}) {
  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap.month;

  const payouts = await prisma.$queryRaw<PayoutsTimeseries[]>`
        SELECT 
          DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
          SUM(amount) AS payouts
        FROM Invoice
        WHERE 
          workspaceId = ${workspaceId}
          AND type = "partnerPayout"
          AND status IN ("processing", "completed")
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
        GROUP BY start
        ORDER BY start ASC;`;

  const tzStartDate = new TZDate(startDate, timezone || "UTC");
  const tzEndDate = new TZDate(endDate, timezone || "UTC");

  let currentDate = startFunction(tzStartDate);

  const payoutsLookup = Object.fromEntries(
    payouts.map((item) => [item.start, Number(item.payouts)]),
  );

  const timeseries: PayoutsTimeseries[] = [];

  while (currentDate < tzEndDate) {
    const periodKey = format(currentDate, formatString);

    timeseries.push({
      start: currentDate.toISOString(),
      payouts: payoutsLookup[periodKey] ?? 0,
    });

    currentDate = dateIncrement(currentDate);
  }

  return timeseries;
}
