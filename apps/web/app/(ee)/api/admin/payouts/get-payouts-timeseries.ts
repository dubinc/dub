import { conn } from "@/lib/planetscale/connection";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { InvoiceStatus } from "@prisma/client";
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
  excludeCreditCardFees = false,
}: {
  programId?: string;
  status?: InvoiceStatus;
  startDate: Date;
  endDate: Date;
  granularity: keyof typeof sqlGranularityMap;
  timezone?: string;
  excludeCreditCardFees?: boolean;
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
    // Optionally remove card processing (2.9%) from invoice fees.
    // amount and fee are stored in cents, so we round the computed deduction.
    `SELECT
      DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ?), ?) as date,
      SUM(amount) as payouts,
      SUM(
        ${
          excludeCreditCardFees
            ? `CASE
                WHEN paymentMethod = 'card' THEN fee - ROUND(amount * 0.029)
                ELSE fee
              END`
            : "fee"
        }
      ) as fees,
      SUM(
        amount + ${
          excludeCreditCardFees
            ? `CASE
                WHEN paymentMethod = 'card' THEN fee - ROUND(amount * 0.029)
                ELSE fee
              END`
            : "fee"
        }
      ) as total
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
