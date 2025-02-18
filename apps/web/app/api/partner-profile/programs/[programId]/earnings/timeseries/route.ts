import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { partnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/timeseries - get timeseries chart for a partner's earnings
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program, links } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const { start, end, interval, groupBy, timezone } =
      partnerEarningsTimeseriesSchema.parse(searchParams);

    const { startDate, endDate, granularity } = getStartEndDates({
      interval,
      start,
      end,
    });

    const { dateFormat, dateIncrement, startFunction, formatString } =
      sqlGranularityMap[granularity];

    const earnings = await prisma.$queryRaw<
      {
        start: string;
        earnings: number;
      }[]
    >`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
        ${groupBy ? (groupBy === "type" ? Prisma.sql`type,` : Prisma.sql`linkId,`) : Prisma.sql``}
        SUM(earnings) AS earnings
      FROM Commission
      WHERE 
        createdAt >= ${startDate}
        AND createdAt < ${endDate}
        AND programId = ${program.id}
        AND partnerId = ${partner.id}
      GROUP BY start${groupBy ? (groupBy === "type" ? Prisma.sql`, type` : Prisma.sql`, linkId`) : Prisma.sql``}
      ORDER BY start ASC;
    `;

    const timeseries: {
      start: string;
      earnings: number;
      groupBy?: string;
      data?: Record<string, number>;
    }[] = [];
    let currentDate = startFunction(
      DateTime.fromJSDate(startDate).setZone(timezone || "UTC"),
    );

    const commissionLookup = earnings.reduce((acc, item) => {
      if (!(item.start in acc)) acc[item.start] = { earnings: 0 };
      acc[item.start].earnings += Number(item.earnings);
      if (groupBy) {
        acc[item.start][item[groupBy]] = Number(item.earnings);
      }
      return acc;
    }, {});

    while (currentDate < endDate) {
      const periodKey = currentDate.toFormat(formatString);
      const { earnings, ...rest } = commissionLookup[periodKey] || {};

      timeseries.push({
        start: currentDate.toISO(),
        earnings: earnings || 0,
        groupBy: groupBy || undefined,
        data: groupBy
          ? {
              ...(groupBy === "type"
                ? {
                    sale: 0,
                    lead: 0,
                    click: 0,
                  }
                : Object.fromEntries(links.map((link) => [link.id, 0]))),
              ...rest,
            }
          : undefined,
      });

      currentDate = dateIncrement(currentDate);
    }

    return NextResponse.json({
      timeseries,
      links: links.map((link) => ({
        id: link.id,
        shortLink: link.shortLink,
        url: link.url,
      })),
    });
  },
);
