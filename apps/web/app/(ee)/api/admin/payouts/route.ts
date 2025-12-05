import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { InvoiceStatus, Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { endOfDay, format, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

interface TimeseriesPoint {
  payouts: number;
  fees: number;
  total: number;
}

interface FormattedTimeseriesPoint extends TimeseriesPoint {
  date: Date;
}

const adminPayoutsQuerySchema = z
  .object({
    programId: z.string().optional(),
    status: z.nativeEnum(InvoiceStatus).optional(),
  })
  .merge(analyticsQuerySchema.pick({ interval: true, start: true, end: true }));

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    programId,
    status,
    interval = "mtd",
    start,
    end,
  } = adminPayoutsQuerySchema.parse(searchParams);

  const timezone = "UTC";
  let { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  // Ensure start/end of day in UTC
  startDate = startOfDay(startDate);
  endDate = endOfDay(endDate);

  // Fetch invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(programId
        ? { programId }
        : {
            AND: [
              {
                programId: {
                  not: ACME_PROGRAM_ID,
                },
              },
              {
                program: {
                  isNot: null,
                },
              },
            ],
          }),
      status: status || {
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
      ${programId ? Prisma.sql`programId = ${programId}` : Prisma.sql`programId != ${ACME_PROGRAM_ID}`}
      AND ${status ? Prisma.sql`status = ${status}` : Prisma.sql`status != 'failed'`}
      AND createdAt >= ${startDate}
      AND createdAt <= ${endDate}
    GROUP BY DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone}), ${dateFormat})
    ORDER BY date ASC;
  `;

  const formattedInvoices = invoices.map((invoice) => ({
    date: invoice.createdAt,
    // we're coercing this cause we've filtered out invoices without a programId above
    programId: invoice.programId!,
    programName: invoice.program!.name,
    programLogo: invoice.program!.logo,
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
  let currentDate = startFunction(startDate);

  const formattedTimeseriesData: FormattedTimeseriesPoint[] = [];

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);

    formattedTimeseriesData.push({
      date: currentDate,
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
