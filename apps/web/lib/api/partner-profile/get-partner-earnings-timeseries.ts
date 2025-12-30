import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { conn } from "@/lib/planetscale/connection";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { format } from "date-fns";
import { z } from "zod";

export async function getPartnerEarningsTimeseries({
  partnerId,
  programId,
  filters,
}: {
  partnerId: string;
  programId: string;
  filters: z.infer<typeof getPartnerEarningsTimeseriesSchema>;
}) {
  const {
    groupBy,
    type,
    status,
    linkId,
    customerId,
    payoutId,
    interval,
    start,
    end,
    timezone,
  } = filters;

  const { program, links } = await getProgramEnrollmentOrThrow({
    partnerId: partnerId,
    programId: programId,
    include: {
      program: true,
      links: true,
    },
  });

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: program.startedAt ?? program.createdAt,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  // Build SQL query with conditional parts
  const selectFields = groupBy
    ? groupBy === "type"
      ? "type,"
      : "linkId,"
    : "";
  const groupByClause = groupBy
    ? groupBy === "type"
      ? ", type"
      : ", linkId"
    : "";

  const whereConditions: string[] = [];
  const params: any[] = [];

  // Add base conditions
  whereConditions.push("earnings > 0");
  whereConditions.push("programId = ?");
  params.push(program.id);
  whereConditions.push("partnerId = ?");
  params.push(partnerId);
  whereConditions.push("createdAt >= ?");
  params.push(
    startDate instanceof Date
      ? format(startDate, "yyyy-MM-dd HH:mm:ss")
      : startDate,
  );
  whereConditions.push("createdAt < ?");
  params.push(
    endDate instanceof Date ? format(endDate, "yyyy-MM-dd HH:mm:ss") : endDate,
  );

  // Add optional filters
  if (type) {
    whereConditions.push("type = ?");
    params.push(type);
  }
  if (payoutId) {
    whereConditions.push("payoutId = ?");
    params.push(payoutId);
  }
  if (linkId) {
    whereConditions.push("linkId = ?");
    params.push(linkId);
  }
  if (customerId) {
    whereConditions.push("customerId = ?");
    params.push(customerId);
  }
  if (status) {
    whereConditions.push("status = ?");
    params.push(status);
  }

  const sql = `
    SELECT 
      DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ?), ?) AS start, 
      ${selectFields}
      SUM(earnings) AS earnings
    FROM Commission
    WHERE ${whereConditions.join(" AND ")}
    GROUP BY start${groupByClause}
    ORDER BY start ASC
  `;

  // Add timezone and dateFormat to params (they go first in the SELECT)
  const queryParams = [timezone || "UTC", dateFormat, ...params];

  interface QueryResult {
    start: string;
    earnings: number;
    type?: string;
    linkId?: string;
  }

  const { rows } = await conn.execute<QueryResult>(sql, queryParams);
  const earnings = (rows && Array.isArray(rows) ? rows : []) as QueryResult[];

  const timeseries: {
    start: string;
    earnings: number;
    groupBy?: string;
    data?: Record<string, number>;
  }[] = [];
  let currentDate = startFunction(startDate);

  const commissionLookup = earnings.reduce((acc, item) => {
    if (!(item.start in acc)) acc[item.start] = { earnings: 0 };
    acc[item.start].earnings += Number(item.earnings);
    if (groupBy) {
      acc[item.start][item[groupBy]] = Number(item.earnings);
    }
    return acc;
  }, {});

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);
    const { earnings, ...rest } = commissionLookup[periodKey] || {};

    timeseries.push({
      start: currentDate.toISOString(),
      earnings: earnings || 0,
      groupBy: groupBy || undefined,
      data: groupBy
        ? {
            ...(groupBy === "type"
              ? Object.fromEntries(
                  ["sale", "lead", "click"]
                    // only show filtered type if type filter is provided
                    .filter((t) => (type ? type === t : true))
                    .map((t) => [t, 0]),
                )
              : Object.fromEntries(
                  links
                    // only show filtered link if linkId filter is provided
                    .filter((link) => (linkId ? link.id === linkId : true))
                    .map((link) => [link.id, 0]),
                )),
            ...rest,
          }
        : undefined,
    });

    currentDate = dateIncrement(currentDate);
  }

  return timeseries;
}
