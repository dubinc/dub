import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
const partnerAnalyticsQuerySchema = analyticsQuerySchema.pick({
  event: true,
  start: true,
  end: true,
  interval: true,
  groupBy: true,
  timezone: true,
});

interface EarningsResult {
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
  earnings: number;
}

interface Earnings {
  start: string;
  earnings: number;
}

const eventMap = {
  clicks: "click",
  leads: "lead",
  sales: "sale",
  composite: "click, lead, sale",
};

// GET /api/partner-profile/programs/[programId]/earnings/timeseries - get timeseries chart for a partner's earnings
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const { start, end, interval, groupBy, event, timezone } =
      partnerAnalyticsQuerySchema.parse(searchParams);

    const { startDate, endDate, granularity } = getStartEndDates({
      interval,
      start,
      end,
    });

    if (groupBy === "count") {
      const earnings = await prisma.$queryRaw<EarningsResult>`
        SELECT
          COUNT(CASE WHEN type = 'click' THEN 1 END) AS clicks,
          COUNT(CASE WHEN type = 'lead' THEN 1 END) AS leads,
          COUNT(CASE WHEN type = 'sale' THEN 1 END) AS sales,
          SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) AS saleAmount,
          SUM(earnings) AS earnings
        FROM Commission
        WHERE
          createdAt >= ${startDate}
          AND createdAt < ${endDate}
          AND programId = ${program.id}
          AND partnerId = ${partner.id}
          ${event !== "composite" ? Prisma.sql`AND type = ${eventMap[event]}` : Prisma.sql``};`;

      return NextResponse.json({
        clicks: Number(earnings[0].clicks) || 0,
        leads: Number(earnings[0].leads) || 0,
        sales: Number(earnings[0].sales) || 0,
        saleAmount: Number(earnings[0].saleAmount) || 0,
        earnings: Number(earnings[0].earnings) || 0,
      });
    }

    const { dateFormat, dateIncrement, startFunction, formatString } =
      sqlGranularityMap[granularity];

    const earnings = await prisma.$queryRaw<Earnings[]>`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
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

    const timeseries: Earnings[] = [];
    let currentDate = startFunction(
      DateTime.fromJSDate(startDate).setZone(timezone || "UTC"),
    );

    const commissionLookup = Object.fromEntries(
      earnings.map((item) => [
        item.start,
        {
          earnings: Number(item.earnings),
        },
      ]),
    );

    while (currentDate < endDate) {
      const periodKey = currentDate.toFormat(formatString);

      timeseries.push({
        start: currentDate.toISO(),
        earnings: commissionLookup[periodKey]?.earnings || 0,
      });

      currentDate = dateIncrement(currentDate);
    }

    return NextResponse.json(timeseries);
  },
);
