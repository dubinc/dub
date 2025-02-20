import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

const programAnalyticsQuerySchema = analyticsQuerySchema.pick({
  event: true,
  start: true,
  end: true,
  interval: true,
  groupBy: true,
  timezone: true,
});

interface Revenue {
  start: string;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
}

// GET /api/programs/[programId]/revenue - get revenue timeseries for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { start, end, interval, timezone } =
      programAnalyticsQuerySchema.parse(searchParams);

    const { startDate, endDate, granularity } = getStartEndDates({
      interval,
      start,
      end,
    });

    const { dateFormat, dateIncrement, startFunction, formatString } =
      sqlGranularityMap[granularity];

    const commissions = await prisma.$queryRaw<Revenue[]>`
      SELECT 
      DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
        COUNT(CASE WHEN type = 'click' THEN 1 END) AS clicks,
        COUNT(CASE WHEN type = 'lead' THEN 1 END) AS leads,
        COUNT(CASE WHEN type = 'sale' THEN 1 END) AS sales,
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) AS saleAmount
      FROM Commission
      WHERE 
        createdAt >= ${startDate}
        AND createdAt < ${endDate}
        AND programId = ${program.id}
      GROUP BY start
      ORDER BY start ASC;
    `;

    const timeseries: Revenue[] = [];
    let currentDate = startFunction(
      DateTime.fromJSDate(startDate).setZone(timezone || "UTC"),
    );

    const revenueLookup = Object.fromEntries(
      commissions.map((item) => [
        item.start,
        {
          clicks: Number(item.clicks),
          leads: Number(item.leads),
          sales: Number(item.sales),
          saleAmount: Number(item.saleAmount),
        },
      ]),
    );

    while (currentDate < endDate) {
      const periodKey = currentDate.toFormat(formatString);

      timeseries.push({
        start: currentDate.toISO(),
        ...(revenueLookup[periodKey] || {
          clicks: 0,
          leads: 0,
          sales: 0,
          saleAmount: 0,
        }),
      });

      currentDate = dateIncrement(currentDate);
    }

    return NextResponse.json(timeseries);
  },
);
