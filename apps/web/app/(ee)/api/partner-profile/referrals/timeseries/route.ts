import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { networkReferralsTimeseriesSchema } from "@/lib/partner-referrals/schemas";
import { NetworkReferralsTimeseries } from "@/lib/partner-referrals/types";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { CommissionType, Prisma } from "@dub/prisma/client";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { format } from "date-fns";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  interval: z.enum(DATE_RANGE_INTERVAL_PRESETS).optional().default("1y"),
  timezone: z.string().optional(),
});

// GET /api/partner-profile/referrals/timeseries
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  if (!["approved", "trusted"].includes(partner.networkStatus)) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "You must be approved in the Dub Partner Network to view referrals.",
    });
  }

  const { interval, timezone } = querySchema.parse(searchParams);

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const [partnersResult, earningsResult] = await Promise.all([
    prisma.$queryRaw<{ start: string; partners: number }[]>(
      Prisma.sql`
        SELECT
          DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start,
          COUNT(*) AS partners
        FROM Partner
        WHERE
          referredByPartnerId = ${partner.id}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
        GROUP BY start
        ORDER BY start ASC
      `,
    ),

    prisma.$queryRaw<{ start: string; earnings: number }[]>(
      Prisma.sql`
        SELECT
          DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start,
          SUM(earnings) AS earnings
        FROM Commission
        WHERE
          partnerId = ${partner.id}
          AND programId = ${NETWORK_PROGRAM_ID}
          AND type = ${CommissionType.referral}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
        GROUP BY start
        ORDER BY start ASC
      `,
    ),
  ]);

  const partnersLookup = partnersResult.reduce(
    (acc, item) => {
      acc[item.start] = Number(item.partners);
      return acc;
    },
    {} as Record<string, number>,
  );

  const earningsLookup = earningsResult.reduce(
    (acc, item) => {
      acc[item.start] = Number(item.earnings);
      return acc;
    },
    {} as Record<string, number>,
  );

  const timeseries: NetworkReferralsTimeseries[] = [];
  let currentDate = startFunction(startDate);

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);

    timeseries.push({
      start: currentDate.toISOString(),
      partners: partnersLookup[periodKey] ?? 0,
      earnings: earningsLookup[periodKey] ?? 0,
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json(
    z.array(networkReferralsTimeseriesSchema).parse(timeseries),
  );
});
