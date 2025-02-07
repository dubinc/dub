import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  format,
  startOfDay,
  startOfHour,
  startOfMinute,
} from "date-fns";
import { NextResponse } from "next/server";

const programAnalyticsQuerySchema = analyticsQuerySchema.pick({
  event: true,
  start: true,
  end: true,
  interval: true,
  groupBy: true,
  timezone: true,
});

// TODO:
// groupBy should be `timeseries`
// What should be the event?

interface CommissionData {
  start: string;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
}

const MySQLGranularity = {
  month: {
    dateFormat: "%Y-%m",
    dateIncrement: (date: Date) => addMonths(date, 1),
    startFunction: (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), 1),
    formatString: "yyyy-MM",
  },
  day: {
    dateFormat: "%Y-%m-%d",
    dateIncrement: (date: Date) => addDays(date, 1),
    startFunction: startOfDay,
    formatString: "yyyy-MM-dd",
  },
  hour: {
    dateFormat: "%Y-%m-%d %H:00",
    dateIncrement: (date: Date) => addHours(date, 1),
    startFunction: startOfHour,
    formatString: "yyyy-MM-dd HH:00",
  },
  minute: {
    dateFormat: "%Y-%m-%d %H:%i",
    dateIncrement: (date: Date) => addMinutes(date, 1),
    startFunction: startOfMinute,
    formatString: "yyyy-MM-dd HH:mm",
  },
} as const;

// GET /api/programs/[programId]/analytics - get analytics for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { event, start, end, interval, timezone } =
      programAnalyticsQuerySchema.parse(searchParams);

    const { startDate, endDate, granularity } = getStartEndDates({
      interval,
      start,
      end,
    });

    const { dateFormat, dateIncrement, startFunction, formatString } =
      MySQLGranularity[granularity];

    const commissions = await prisma.$queryRaw<CommissionData[]>`
      SELECT 
        DATE_FORMAT(createdAt, ${dateFormat}) AS start, -- Renamed from period to start
        COUNT(CASE WHEN type = 'click' THEN 1 END) AS clicks,
        COUNT(CASE WHEN type = 'lead' THEN 1 END) AS leads,
        COUNT(CASE WHEN type = 'sale' THEN 1 END) AS sales,
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) AS saleAmount
      FROM Commission
      WHERE 
        createdAt BETWEEN ${startDate} AND ${endDate} 
        AND programId = ${program.id}
      GROUP BY start
      ORDER BY start ASC;
    `;

    const dataMap = new Map();
    const result: CommissionData[] = [];
    let currentDate = startFunction(startDate);

    commissions.forEach((item) => {
      dataMap.set(item.start, {
        clicks: Number(item.clicks) || 0,
        leads: Number(item.leads) || 0,
        sales: Number(item.sales) || 0,
        saleAmount: Number(item.saleAmount) || 0,
      });
    });

    while (currentDate <= endDate) {
      const periodKey = format(currentDate, formatString);

      result.push({
        start: format(currentDate, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        clicks: dataMap.get(periodKey)?.clicks || 0,
        leads: dataMap.get(periodKey)?.leads || 0,
        sales: dataMap.get(periodKey)?.sales || 0,
        saleAmount: dataMap.get(periodKey)?.saleAmount || 0,
      });

      currentDate = dateIncrement(currentDate);
    }

    return NextResponse.json(result);
  },
);
