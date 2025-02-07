import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
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

const partnerAnalyticsQuerySchema = analyticsQuerySchema.pick({
  event: true,
  start: true,
  end: true,
  interval: true,
  groupBy: true,
  timezone: true,
});

interface CommissionData {
  start: string;
  earnings: number;
}

const granularityMap = {
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

// GET /api/partner-profile/programs/[programId]/commissions/analytics - get analytics for a program
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const { start, end, interval, timezone, groupBy } =
      partnerAnalyticsQuerySchema.parse(searchParams);

    const { startDate, endDate, granularity } = getStartEndDates({
      interval,
      start,
      end,
    });

    const { dateFormat, dateIncrement, startFunction, formatString } =
      granularityMap[granularity];

    const commissions = await prisma.$queryRaw<CommissionData[]>`
      SELECT 
        DATE_FORMAT(createdAt, ${dateFormat}) AS start, 
        SUM(earnings) AS earnings
      FROM Commission
      WHERE 
        createdAt >= ${startDate}
        AND createdAt < ${endDate}
        AND programId = ${program.id}
        AND partnerId = ${partner.id}
      GROUP BY start
      ORDER BY start ASC;
    `;

    let currentDate = startFunction(startDate);
    const result: CommissionData[] = [];
    const dataMap = new Map<string, CommissionData>();

    commissions.forEach((item) => {
      dataMap.set(item.start, {
        start: item.start,
        earnings: Number(item.earnings),
      });
    });

    console.log("Kiran", {
      commissions,
      dataMap,
      startDate,
      endDate,
      granularity,
      currentDate,
    });

    while (currentDate <= endDate) {
      const periodKey = format(currentDate, formatString);

      result.push({
        start: format(currentDate, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        earnings: dataMap.get(periodKey)?.earnings || 0,
      });

      currentDate = dateIncrement(currentDate);
    }

    return NextResponse.json(result);
  },
);
