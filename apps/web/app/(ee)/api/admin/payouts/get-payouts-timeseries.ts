import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { conn } from "@/lib/planetscale/connection";
import { InvoiceStatus } from "@dub/prisma/client";
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

const toSqlDateTime = (date: Date) =>
  date.toISOString().slice(0, 19).replace("T", " ");

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

  const whereClauses: string[] = ["createdAt >= ?", "createdAt <= ?"];
  const queryParams: string[] = [
    toSqlDateTime(startDate),
    toSqlDateTime(endDate),
  ];

  if (programId) {
    whereClauses.unshift("programId = ?");
    queryParams.unshift(programId);
  } else {
    whereClauses.unshift("programId != ?");
    queryParams.unshift(ACME_PROGRAM_ID);
  }

  if (status) {
    whereClauses.push("status = ?");
    queryParams.push(status);
  } else {
    whereClauses.push("status != ?");
    queryParams.push("failed");
  }

  const { rows } = await conn.execute<{
    date: string;
    payouts: number;
    fees: number;
    total: number;
  }>(
    `SELECT
      DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ?), ?) as date,
      SUM(amount) as payouts,
      SUM(fee) as fees,
      SUM(total) as total
    FROM Invoice
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ?), ?)
    ORDER BY date ASC`,
    [timezone, dateFormat, ...queryParams, timezone, dateFormat],
  );

  const timeseriesData = rows ?? [];

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
