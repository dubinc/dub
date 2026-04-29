import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { CommissionStatus, Prisma } from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import { format } from "date-fns";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = analyticsQuerySchema
  .pick({ start: true, end: true, interval: true, timezone: true })
  .extend({
    status: z.enum(CommissionStatus).optional(),
    partnerId: z.string().optional(),
    groupId: z.string().optional(),
    type: z.string().optional(),
  });

interface CommissionTimeseriesRow {
  start: string;
  earnings: bigint | number;
  count: bigint | number;
}

// GET /api/commissions/timeseries - get commissions timeseries for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { start, end, interval, timezone, status, partnerId, groupId, type } =
    querySchema.parse(searchParams);

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom:
      interval === "all"
        ? await getProgramOrThrow({
            workspaceId: workspace.id,
            programId,
          }).then((program) => program.startedAt ?? program.createdAt)
        : undefined,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const partnerFilter = parseFilterValue(partnerId);
  const typeFilter = parseFilterValue(type);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`c.programId = ${programId}`,
    Prisma.sql`c.createdAt >= ${startDate}`,
    Prisma.sql`c.createdAt < ${endDate}`,
    status
      ? Prisma.sql`c.status = ${status}`
      : Prisma.sql`c.status NOT IN (${Prisma.join([
          CommissionStatus.duplicate,
          CommissionStatus.fraud,
          CommissionStatus.canceled,
        ])})`,
  ];

  if (partnerFilter) {
    const list = Prisma.join(partnerFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      partnerFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`c.partnerId NOT IN (${list})`
        : Prisma.sql`c.partnerId IN (${list})`,
    );
  }

  if (typeFilter) {
    const list = Prisma.join(typeFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      typeFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`c.type NOT IN (${list})`
        : Prisma.sql`c.type IN (${list})`,
    );
  }
  if (groupId) {
    const groupFilter = parseFilterValue(groupId);
    if (groupFilter) {
      const list = Prisma.join(groupFilter.values.map((v) => Prisma.sql`${v}`));
      const op =
        groupFilter.sqlOperator === "NOT IN"
          ? Prisma.sql`NOT IN`
          : Prisma.sql`IN`;
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM ProgramEnrollment pe
        WHERE pe.programId = c.programId
          AND pe.partnerId = c.partnerId
          AND pe.groupId ${op} (${list})
      )`);
    }
  }

  const whereClause = Prisma.join(conditions, " AND ");

  console.time("getCommissionsTimeseries");
  const rows = await prisma.$queryRaw<CommissionTimeseriesRow[]>(
    Prisma.sql`
      SELECT
        DATE_FORMAT(CONVERT_TZ(c.createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start,
        SUM(c.earnings) AS earnings,
        COUNT(c.id) AS count
      FROM Commission c
      WHERE ${whereClause}
      GROUP BY start
      ORDER BY start ASC`,
  );
  console.timeEnd("getCommissionsTimeseries");

  let currentDate = startFunction(startDate);

  const earningsLookup = Object.fromEntries(
    rows.map((item) => [
      item.start,
      { earnings: Number(item.earnings), count: Number(item.count) },
    ]),
  );

  const timeseries: { start: string; earnings: number; count: number }[] = [];

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);
    timeseries.push({
      start: currentDate.toISOString(),
      ...(earningsLookup[periodKey] ?? { earnings: 0, count: 0 }),
    });
    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json(timeseries);
});
