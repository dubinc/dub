import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
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

// GET /api/programs/[programId]/commissions - get commissions timeseries for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: params.programId,
    });

    const { start, end, interval, timezone } = querySchema.parse(searchParams);

    const { startDate, endDate, granularity } = getStartEndDates({
      interval,
      start,
      end,
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
        AND programId = ${program.id}
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
  },
);
