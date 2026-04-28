import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  applicationEventAnalyticsQuerySchema,
  applicationEventAnalyticsSchema,
} from "@/lib/application-events/schema";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { format } from "date-fns/format";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type TimeseriesApplicationRow = {
  start: string;
  visits: bigint;
  starts: bigint;
  submissions: bigint;
  approvals: bigint;
  rejections: bigint;
};

// GET /api/applications/analytics
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const {
    groupBy,
    groupId,
    partnerId,
    country,
    referralSource,
    start,
    end,
    interval,
    timezone,
  } = applicationEventAnalyticsQuerySchema.parse(searchParams);

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerId && { partnerId }),
    ...(country && { country }),
    ...(referralSource && { referralSource }),
    ...(groupId && { application: { groupId } }),
    visitedAt: {
      gte: startDate,
      lt: endDate,
    },
  };

  const aggregations = {
    _count: {
      visitedAt: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      rejectedAt: true,
    },
  } as const;

  const responseSchema = applicationEventAnalyticsSchema[groupBy];

  // Get the absolute counts
  if (groupBy === "count") {
    const { _count } = await prisma.programApplicationEvent.aggregate({
      where,
      ...aggregations,
    });

    return NextResponse.json(responseSchema.parse(formatCounts(_count)));
  }

  // Get the counts grouped by the specified column
  if (groupBy === "referralSource" || groupBy === "country") {
    const events = await prisma.programApplicationEvent.groupBy({
      by: [groupBy],
      where,
      ...aggregations,
    });

    const results = events.map((row) => ({
      [groupBy]: row[groupBy],
      ...formatCounts(row._count),
    }));

    return NextResponse.json(z.array(responseSchema).parse(results));
  }

  // Get the timeseries
  if (groupBy === "timeseries") {
    const { dateFormat, dateIncrement, startFunction, formatString } =
      sqlGranularityMap[granularity];

    const conditions: Prisma.Sql[] = [
      Prisma.sql`e.programId = ${programId}`,
      Prisma.sql`e.visitedAt >= ${startDate}`,
      Prisma.sql`e.visitedAt < ${endDate}`,
    ];

    if (partnerId) {
      conditions.push(Prisma.sql`e.partnerId = ${partnerId}`);
    }

    if (groupId) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM ProgramApplication pa
        WHERE pa.id = e.programApplicationId
          AND pa.groupId = ${groupId}
      )`);
    }

    if (country) {
      conditions.push(Prisma.sql`e.country = ${country}`);
    }

    if (referralSource) {
      conditions.push(Prisma.sql`e.referralSource = ${referralSource}`);
    }

    const whereClause = Prisma.join(conditions, " AND ");

    const rows = await prisma.$queryRaw<TimeseriesApplicationRow[]>(
      Prisma.sql`
      SELECT
        DATE_FORMAT(CONVERT_TZ(e.visitedAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start,
        COUNT(e.visitedAt) AS visits,
        COUNT(e.startedAt) AS starts,
        COUNT(e.submittedAt) AS submissions,
        COUNT(e.approvedAt) AS approvals,
        COUNT(e.rejectedAt) AS rejections
      FROM ProgramApplicationEvent e
      WHERE ${whereClause}
      GROUP BY start
      ORDER BY start ASC`,
    );

    const lookup = Object.fromEntries(
      rows.map((r) => [
        r.start,
        {
          visits: Number(r.visits),
          starts: Number(r.starts),
          submissions: Number(r.submissions),
          approvals: Number(r.approvals),
          rejections: Number(r.rejections),
        },
      ]),
    );

    let currentDate = startFunction(startDate);
    const timeseries: z.infer<typeof responseSchema>[] = [];

    while (currentDate < endDate) {
      const periodKey = format(currentDate, formatString);

      timeseries.push({
        start: currentDate.toISOString(),
        ...(lookup[periodKey] ?? {
          visits: 0,
          starts: 0,
          submissions: 0,
          approvals: 0,
          rejections: 0,
        }),
      });

      currentDate = dateIncrement(currentDate);
    }

    return NextResponse.json(z.array(responseSchema).parse(timeseries));
  }

  return NextResponse.json(null);
});

function formatCounts(c: {
  visitedAt: number;
  startedAt: number;
  submittedAt: number;
  approvedAt: number;
  rejectedAt: number;
}) {
  return {
    visits: c.visitedAt,
    starts: c.startedAt,
    submissions: c.submittedAt,
    approvals: c.approvedAt,
    rejections: c.rejectedAt,
  };
}
