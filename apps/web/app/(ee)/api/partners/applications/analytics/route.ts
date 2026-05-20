import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  applicationEventAnalyticsQuerySchema,
  applicationEventAnalyticsSchema,
} from "@/lib/application-events/schema";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { ApplicationEventAnalyticsQuery } from "@/lib/types";
import { TZDate, tz } from "@date-fns/tz";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import { format } from "date-fns/format";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type TimeseriesApplicationRow = {
  start: string | Date;
  visits: bigint;
  starts: bigint;
  submissions: bigint;
  approvals: bigint;
  rejections: bigint;
};

const aggregations = {
  _count: {
    visitedAt: true,
    startedAt: true,
    submittedAt: true,
    approvedAt: true,
    rejectedAt: true,
  },
} as const;

// GET /api/partners/applications/analytics
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const parsedFilters =
    applicationEventAnalyticsQuerySchema.parse(searchParams);

  const {
    groupBy,
    partnerId,
    country,
    referralSource,
    start,
    end,
    interval,
    timezone: timezoneParam,
  } = parsedFilters;

  // Align with CONVERT_TZ in raw SQL and analyticsQuerySchema default (UTC when omitted).
  const timezone = timezoneParam ?? "UTC";

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const countryFilter = parseFilterValue(country);
  const referralSourceFilter = parseFilterValue(referralSource);

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerFilter && {
      referredByPartnerId:
        partnerFilter.sqlOperator === "NOT IN"
          ? { notIn: partnerFilter.values }
          : { in: partnerFilter.values },
    }),
    ...(referralSourceFilter && {
      referralSource:
        referralSourceFilter.sqlOperator === "NOT IN"
          ? { notIn: referralSourceFilter.values }
          : { in: referralSourceFilter.values },
    }),
    ...(countryFilter && {
      country:
        countryFilter.sqlOperator === "NOT IN"
          ? { notIn: countryFilter.values }
          : { in: countryFilter.values },
    }),
    visitedAt: {
      gte: startDate,
      lt: endDate,
    },
  };

  const responseSchema = applicationEventAnalyticsSchema[groupBy];

  // Get the absolute counts
  if (groupBy === "count") {
    const { _count } = await prisma.programApplicationEvent.aggregate({
      where,
      ...aggregations,
    });

    return NextResponse.json(responseSchema.parse(formatCounts(_count)));
  }

  // Get the counts grouped by the specified column
  if (["referralSource", "country"].includes(groupBy)) {
    const groupByColumnMap = {
      referralSource: "referralSource",
      country: "country",
    };

    const groupByColumn = groupByColumnMap[groupBy];

    const events = await prisma.programApplicationEvent.groupBy({
      by: [groupByColumn],
      where,
      ...aggregations,
      orderBy: {
        _count: {
          [groupBy]: "desc",
        },
      },
    });

    const results = events
      .filter((row) => row[groupByColumn] !== null)
      .map((row) => ({
        [groupBy]: row[groupByColumn],
        ...formatCounts(row._count),
      }));

    return NextResponse.json(z.array(responseSchema).parse(results));
  }

  // Get the counts grouped by the partner
  if (groupBy === "partnerId") {
    return byPartnerId({
      where,
      programId,
    });
  }

  // Get the timeseries
  if (groupBy === "timeseries") {
    return byTimeseries({
      ...parsedFilters,
      programId,
      timezone,
    });
  }

  return NextResponse.json(null);
});

async function byPartnerId({
  where,
  programId,
}: {
  where: Prisma.ProgramApplicationEventWhereInput;
  programId: string;
}) {
  const events = await prisma.programApplicationEvent.groupBy({
    by: ["referredByPartnerId"],
    where,
    ...aggregations,
  });

  const partnerIds = events
    .map(({ referredByPartnerId }) => referredByPartnerId)
    .filter((id): id is string => Boolean(id));

  const partners =
    partnerIds.length > 0
      ? await prisma.partner.findMany({
          where: {
            id: {
              in: partnerIds,
            },
            // TODO: remove this once we have a way to show the partners + CTA to invite them
            programs: {
              some: {
                programId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        })
      : [];

  const eventCountByPartnerId = new Map(
    events.map(({ referredByPartnerId, _count }) => [
      referredByPartnerId,
      _count,
    ]),
  );

  const results = partners
    .map((partner) => {
      const partnerEvents = eventCountByPartnerId.get(partner.id);

      if (!partnerEvents) {
        return null;
      }

      return {
        partner,
        ...formatCounts(partnerEvents),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json(
    z.array(applicationEventAnalyticsSchema["partnerId"]).parse(results),
  );
}

async function byTimeseries({
  programId,
  partnerId,
  country,
  referralSource,
  timezone,
  interval,
  start,
  end,
}: ApplicationEventAnalyticsQuery & { programId: string }) {
  const tzId = timezone ?? "UTC";

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    timezone: tzId,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const partnerFilter = parseFilterValue(partnerId);
  const countryFilter = parseFilterValue(country);
  const referralSourceFilter = parseFilterValue(referralSource);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`e.programId = ${programId}`,
    Prisma.sql`e.visitedAt >= ${startDate}`,
    Prisma.sql`e.visitedAt < ${endDate}`,
  ];

  if (partnerFilter) {
    const list = Prisma.join(partnerFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      partnerFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.partnerId NOT IN (${list})`
        : Prisma.sql`e.partnerId IN (${list})`,
    );
  }

  if (referralSourceFilter) {
    const list = Prisma.join(
      referralSourceFilter.values.map((v) => Prisma.sql`${v}`),
    );
    conditions.push(
      referralSourceFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.referralSource NOT IN (${list})`
        : Prisma.sql`e.referralSource IN (${list})`,
    );
  }

  if (countryFilter) {
    const list = Prisma.join(countryFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      countryFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.country NOT IN (${list})`
        : Prisma.sql`e.country IN (${list})`,
    );
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<TimeseriesApplicationRow[]>(
    Prisma.sql`
      SELECT
        DATE_FORMAT(CONVERT_TZ(e.visitedAt, "UTC", ${tzId}), ${dateFormat}) AS start,
        COUNT(e.visitedAt) AS visits,
        COUNT(e.startedAt) AS starts,
        COUNT(e.submittedAt) AS submissions,
        COUNT(e.approvedAt) AS approvals,
        COUNT(e.rejectedAt) AS rejections
      FROM ProgramApplicationEvent e
      WHERE ${whereClause}
      GROUP BY start
      ORDER BY start ASC`,
  );

  const periodKeyFromSql = (start: TimeseriesApplicationRow["start"]) =>
    typeof start === "string"
      ? start
      : format(new TZDate(start, tzId), formatString, {
          in: tz(tzId),
        });

  const lookup = Object.fromEntries(
    rows.map((r) => [
      periodKeyFromSql(r.start),
      {
        visits: Number(r.visits),
        starts: Number(r.starts),
        submissions: Number(r.submissions),
        approvals: Number(r.approvals),
        rejections: Number(r.rejections),
      },
    ]),
  );

  const tzStartDate = new TZDate(startDate, tzId);
  const tzEndDate = new TZDate(endDate, tzId);

  let currentDate = startFunction(tzStartDate);
  const timeseries: z.infer<
    (typeof applicationEventAnalyticsSchema)["timeseries"]
  >[] = [];

  while (currentDate < tzEndDate) {
    const periodKey = format(currentDate, formatString, {
      in: tz(tzId),
    });

    timeseries.push({
      start: currentDate.toISOString(),
      ...(lookup[periodKey] ?? {
        visits: 0,
        starts: 0,
        submissions: 0,
        approvals: 0,
        rejections: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json(
    z.array(applicationEventAnalyticsSchema["timeseries"]).parse(timeseries),
  );
}

function formatCounts(c: {
  visitedAt: number;
  startedAt: number;
  submittedAt: number;
  approvedAt: number;
  rejectedAt: number;
}) {
  return {
    visits: c.visitedAt,
    starts: c.startedAt,
    submissions: c.submittedAt,
    approvals: c.approvedAt,
    rejections: c.rejectedAt,
  };
}
