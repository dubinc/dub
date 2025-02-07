import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { format } from "date-fns";
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
      sqlGranularityMap[granularity];

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

    while (currentDate < endDate) {
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
