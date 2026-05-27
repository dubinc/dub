import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { InvoiceStatus, Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { format } from "date-fns";

interface TimeseriesPoint {
  payouts: number;
  fees: number;
  total: number;
}

export interface FormattedPayoutsTimeseriesPoint extends TimeseriesPoint {
  date: Date;
}

export async function getPayoutsTimeseries({
  programId,
  status,
  startDate,
  endDate,
  granularity,
  timezone = "UTC",
}: {
  programId?: string;
  status?: InvoiceStatus;
  startDate: Date;
  endDate: Date;
  granularity: keyof typeof sqlGranularityMap;
  timezone?: string;
}) {
  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

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

  let currentDate = startFunction(startDate);
  const formattedTimeseriesData: FormattedPayoutsTimeseriesPoint[] = [];

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

  return formattedTimeseriesData;
}
