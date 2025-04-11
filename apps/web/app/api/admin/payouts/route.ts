import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { ACME_WORKSPACE_ID } from "@dub/utils";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

interface TimeseriesPoint {
  payouts: number;
  fees: number;
}

interface FormattedTimeseriesPoint extends TimeseriesPoint {
  date: Date;
}

export const GET = withAdmin(async ({ searchParams }) => {
  const { interval = "mtd", start, end, timezone = "UTC" } = searchParams;

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
  });

  // Fetch invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId: {
        not: ACME_WORKSPACE_ID,
      },
      status: "completed",
      paidAt: {
        not: null,
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      paidAt: "desc",
    },
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  // Calculate timeseries data for payouts and fees
  const timeseriesData = await prisma.$queryRaw<
    { date: Date; payouts: number; fees: number }[]
  >`
    SELECT 
      DATE_FORMAT(CONVERT_TZ(paidAt, "UTC", ${timezone}), ${dateFormat}) as date,
      SUM(amount) as payouts,
      SUM(fee) as fees
    FROM Invoice
    WHERE 
      workspaceId != ${ACME_WORKSPACE_ID}
      AND status = 'completed'
      AND paidAt IS NOT NULL
      AND paidAt >= ${startDate}
      AND paidAt <= ${endDate}
    GROUP BY DATE_FORMAT(CONVERT_TZ(paidAt, "UTC", ${timezone}), ${dateFormat})
    ORDER BY date ASC;
  `;

  const formattedInvoices = invoices.map((invoice) => ({
    date: invoice.paidAt!,
    number: invoice.number,
    status: invoice.status,
    amount: invoice.amount,
    fee: invoice.fee,
    total: invoice.total,
  }));

  // Create a lookup object for the timeseries data
  const timeseriesLookup: Record<string, TimeseriesPoint> = Object.fromEntries(
    timeseriesData.map((item) => [
      item.date,
      {
        payouts: Number(item.payouts),
        fees: Number(item.fees),
      },
    ]),
  );

  // Backfill missing dates with 0 values
  let currentDate = startFunction(
    DateTime.fromJSDate(startDate).setZone(timezone),
  );

  const formattedTimeseriesData: FormattedTimeseriesPoint[] = [];

  while (currentDate < endDate) {
    const periodKey = currentDate.toFormat(formatString);

    formattedTimeseriesData.push({
      date: currentDate.toJSDate(),
      ...(timeseriesLookup[periodKey] || {
        payouts: 0,
        fees: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json({
    invoices: formattedInvoices,
    timeseriesData: formattedTimeseriesData,
  });
});
