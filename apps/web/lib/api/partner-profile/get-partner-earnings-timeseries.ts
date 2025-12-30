import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { format } from "date-fns";
import { z } from "zod";

export async function getPartnerEarningsTimeseries({
  partnerId,
  programId,
  filters,
}: {
  partnerId: string;
  programId: string;
  filters: z.infer<typeof getPartnerEarningsTimeseriesSchema>;
}) {
  const {
    groupBy,
    type,
    status,
    linkId,
    customerId,
    payoutId,
    interval,
    start,
    end,
    timezone,
  } = filters;

  const { program, links } = await getProgramEnrollmentOrThrow({
    partnerId: partnerId,
    programId: programId,
    include: {
      program: true,
      links: true,
    },
  });

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: program.startedAt ?? program.createdAt,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const earnings = await prisma.$queryRaw<
    {
      start: string;
      earnings: number;
      type?: string;
      linkId?: string;
    }[]
  >`
        SELECT 
          DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
          ${groupBy ? (groupBy === "type" ? Prisma.sql`type,` : Prisma.sql`linkId,`) : Prisma.sql``}
          SUM(earnings) AS earnings
        FROM Commission
        WHERE 
          earnings > 0
          AND programId = ${program.id}
          AND partnerId = ${partnerId}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
          ${type ? Prisma.sql`AND type = ${type}` : Prisma.sql``}
          ${payoutId ? Prisma.sql`AND payoutId = ${payoutId}` : Prisma.sql``}
          ${linkId ? Prisma.sql`AND linkId = ${linkId}` : Prisma.sql``}
          ${customerId ? Prisma.sql`AND customerId = ${customerId}` : Prisma.sql``}
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.sql``}
          GROUP BY start${groupBy ? (groupBy === "type" ? Prisma.sql`, type` : Prisma.sql`, linkId`) : Prisma.sql``}
        ORDER BY start ASC;
      `;

  const timeseries: {
    start: string;
    earnings: number;
    groupBy?: string;
    data?: Record<string, number>;
  }[] = [];
  let currentDate = startFunction(startDate);

  const commissionLookup = earnings.reduce(
    (acc, item) => {
      if (!(item.start in acc)) {
        acc[item.start] = { earnings: 0 };
      }
      acc[item.start].earnings += Number(item.earnings);
      if (groupBy && item[groupBy]) {
        acc[item.start][item[groupBy] as string] = Number(item.earnings);
      }
      return acc;
    },
    {} as Record<string, { earnings: number; [key: string]: number }>,
  );

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);
    const periodData = commissionLookup[periodKey];
    const { earnings, ...rest } = periodData || { earnings: 0 };

    timeseries.push({
      start: currentDate.toISOString(),
      earnings: earnings || 0,
      groupBy: groupBy || undefined,
      data: groupBy
        ? {
            ...(groupBy === "type"
              ? Object.fromEntries(
                  ["sale", "lead", "click"]
                    // only show filtered type if type filter is provided
                    .filter((t) => (type ? type === t : true))
                    .map((t) => [t, 0]),
                )
              : Object.fromEntries(
                  links
                    // only show filtered link if linkId filter is provided
                    .filter((link) => (linkId ? link.id === linkId : true))
                    .map((link) => [link.id, 0]),
                )),
            ...(rest as Record<string, number>),
          }
        : undefined,
    });

    currentDate = dateIncrement(currentDate);
  }

  return timeseries;
}
