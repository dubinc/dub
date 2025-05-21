import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

const querySchema = analyticsQuerySchema.pick({
  start: true,
  end: true,
  interval: true,
  timezone: true,
});

interface Commission {
  start: string;
  earnings: number;
}

// GET /api/commissions/timeseries - get commissions timeseries for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { start, end, interval, timezone } = querySchema.parse(searchParams);

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom:
      // ideally we should get the first commission event date for dataAvailableFrom
      interval === "all"
        ? await getProgramOrThrow({
            workspaceId: workspace.id,
            programId,
          }).then((program) => program.createdAt)
        : undefined,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const commissions = await prisma.$queryRaw<Commission[]>`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
        SUM(earnings) AS earnings
      FROM Commission
      WHERE 
        earnings > 0
        AND programId = ${programId}
        AND createdAt >= ${startDate}
        AND createdAt < ${endDate}
      GROUP BY start
      ORDER BY start ASC;`;

  let currentDate = startFunction(
    DateTime.fromJSDate(startDate).setZone(timezone || "UTC"),
  );

  const earningsLookup = Object.fromEntries(
    commissions.map((item) => [
      item.start,
      {
        earnings: Number(item.earnings),
      },
    ]),
  );

  const timeseries: Commission[] = [];

  while (currentDate < endDate) {
    const periodKey = currentDate.toFormat(formatString);

    timeseries.push({
      start: currentDate.toISO(),
      ...(earningsLookup[periodKey] || {
        earnings: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json(timeseries);
});
