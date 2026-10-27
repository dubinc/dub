import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@/lib/prisma";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import * as z from "zod/v4";

export async function getPartnerEarningsTimeseries({
  partnerId,
  programId,
  filters,
}: {
  partnerId: string;
  programId?: string; // must be checked against the partner's enrollments first. If not provided, earnings across all programs (except the network program) are returned
  filters: Omit<
    z.infer<typeof getPartnerEarningsTimeseriesSchema>,
    "groupBy"
  > & {
    groupBy?:
      | z.infer<typeof getPartnerEarningsTimeseriesSchema>["groupBy"]
      | "programId";
  };
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

  const scope = await getEarningsScope({
    partnerId,
    programId,
    linkId,
    includeLinks: groupBy === "linkId",
    // getStartEndDates only uses dataAvailableFrom for the "all" interval
    includeDataAvailableFrom: interval === "all" && !start,
  });

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: scope.dataAvailableFrom,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const groupByColumn = !groupBy
    ? null
    : groupBy === "type"
      ? Prisma.sql`type`
      : groupBy === "programId"
        ? Prisma.sql`programId`
        : Prisma.sql`linkId`;

  const query = Prisma.sql`
        SELECT 
          DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
          ${groupByColumn ? Prisma.sql`${groupByColumn},` : Prisma.sql``}
          SUM(earnings) AS earnings
        FROM Commission
        WHERE 
          earnings != 0
          ${programId ? Prisma.sql`AND programId = ${programId}` : Prisma.sql`AND programId != ${NETWORK_PROGRAM_ID}`}
          AND partnerId = ${partnerId}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
          ${type ? Prisma.sql`AND type = ${type}` : Prisma.sql``}
          ${payoutId ? Prisma.sql`AND payoutId = ${payoutId}` : Prisma.sql``}
          ${linkId ? Prisma.sql`AND linkId = ${linkId}` : Prisma.sql``}
          ${customerId ? Prisma.sql`AND customerId = ${customerId}` : Prisma.sql``}
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.sql``}
          GROUP BY start${groupByColumn ? Prisma.sql`, ${groupByColumn}` : Prisma.sql``}
        ORDER BY start ASC;
      `;

  const earnings = await prisma.$queryRaw<
    {
      start: string;
      earnings: number;
      type?: string;
      linkId?: string;
      programId?: string;
    }[]
  >(query);

  const emptyGroups: Record<string, number> = !groupBy
    ? {}
    : Object.fromEntries(
        (groupBy === "type"
          ? ["sale", "lead", "click"]
              // only show filtered type if type filter is provided
              .filter((t) => (type ? type === t : true))
          : groupBy === "programId" || !programId
            ? // across programs, only include the groups that have earnings
              [
                ...new Set(
                  earnings
                    .map((e) =>
                      groupBy === "programId" ? e.programId : e.linkId,
                    )
                    .filter((key): key is string => !!key),
                ),
              ]
            : scope.links.map((link) => link.id)
        ).map((key) => [key, 0]),
      );

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
            ...emptyGroups,
            ...(rest as Record<string, number>),
          }
        : undefined,
    });

    currentDate = dateIncrement(currentDate);
  }

  return timeseries;
}

async function getEarningsScope({
  partnerId,
  programId,
  linkId,
  includeLinks,
  includeDataAvailableFrom,
}: {
  partnerId: string;
  programId?: string;
  linkId?: string;
  includeLinks: boolean;
  includeDataAvailableFrom: boolean;
}): Promise<{
  links: { id: string }[];
  dataAvailableFrom?: Date;
}> {
  const [programs, links] = await Promise.all([
    includeDataAvailableFrom
      ? prisma.program.findMany({
          where: programId
            ? { id: programId }
            : {
                id: {
                  not: NETWORK_PROGRAM_ID,
                },
                partners: {
                  some: {
                    partnerId,
                  },
                },
              },
          select: {
            startedAt: true,
            createdAt: true,
          },
        })
      : [],
    // for one program, the chart shows every link of the program, including links without earnings
    includeLinks && programId
      ? prisma.link.findMany({
          where: {
            programId,
            partnerId,
            // only show the filtered link if a linkId filter is provided
            ...(linkId && { id: linkId }),
          },
          select: {
            id: true,
          },
        })
      : [],
  ]);

  const programStartTimes = programs.map(({ startedAt, createdAt }) =>
    (startedAt ?? createdAt).getTime(),
  );

  return {
    links,
    dataAvailableFrom:
      programStartTimes.length > 0
        ? new Date(Math.min(...programStartTimes))
        : undefined,
  };
}
