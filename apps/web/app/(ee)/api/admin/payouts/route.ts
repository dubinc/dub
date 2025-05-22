import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

interface TimeseriesPoint {
  payouts: number;
  fees: number;
  total: number;
}

interface FormattedTimeseriesPoint extends TimeseriesPoint {
  date: Date;
}

export const GET = withAdmin(async ({ searchParams }) => {
  const { interval = "mtd", start, end } = searchParams;

  let { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
  });

  const timezone = "UTC";
  // convert to UTC
  startDate = DateTime.fromJSDate(startDate)
    .setZone(timezone)
    .startOf("day")
    .toUTC()
    .toJSDate();

  endDate = DateTime.fromJSDate(endDate)
    .setZone(timezone)
    .endOf("day")
    .toUTC()
    .toJSDate();

  // Fetch invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      programId: {
        not: ACME_PROGRAM_ID,
      },
      status: {
        not: "failed",
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      program: {
        select: {
          name: true,
          logo: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  // Calculate timeseries data for payouts and fees
  const timeseriesData = await prisma.$queryRaw<
    { date: Date; payouts: number; fees: number; total: number }[]
  >`
    SELECT 
      DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone}), ${dateFormat}) as date,
      SUM(amount) as payouts,
      SUM(fee) as fees,
      SUM(total) as total
    FROM Invoice
    WHERE 
      programId != ${ACME_PROGRAM_ID}
      AND status != 'failed'
      AND createdAt >= ${startDate}
      AND createdAt <= ${endDate}
    GROUP BY DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone}), ${dateFormat})
    ORDER BY date ASC;
  `;

  const formattedInvoices = invoices.map((invoice) => ({
    date: invoice.createdAt,
    programName: invoice.program.name,
    programLogo: invoice.program.logo,
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
        total: Number(item.total),
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
        total: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json({
    invoices: formattedInvoices,
    timeseriesData: formattedTimeseriesData,
  });
});
