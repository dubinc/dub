import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { DateTime } from "luxon";

export async function getTopProgramsByCommissions({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}) {
  const programCommissions = await prisma.commission.groupBy({
    by: ["programId"],
    _sum: {
      earnings: true,
      amount: true,
    },
    where: {
      earnings: {
        gt: 0,
      },
      programId: {
        not: ACME_PROGRAM_ID,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
  });

  const topPrograms = await prisma.program.findMany({
    where: {
      id: {
        in: programCommissions.map(({ programId }) => programId),
      },
    },
  });

  const topProgramsWithCommissions = programCommissions.map(
    ({ programId, _sum }) => ({
      ...topPrograms.find((program) => program.id === programId),
      commissions: _sum.earnings || 0,
      revenue: _sum.amount || 0,
    }),
  );

  return topProgramsWithCommissions;
}

interface Commission {
  start: string;
  commissions: number;
  revenue: number;
}

export async function getCommissionsTimeseries({
  startDate,
  endDate,
  granularity,
  timezone,
}: {
  startDate: Date;
  endDate: Date;
  granularity: string;
  timezone: string;
}) {
  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const commissions = await prisma.$queryRaw<Commission[]>`
        SELECT 
          DATE_FORMAT(CONVERT_TZ(createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start, 
          SUM(earnings) AS commissions,
          SUM(amount) AS revenue
        FROM Commission
        WHERE 
          earnings > 0
          AND programId != ${ACME_PROGRAM_ID}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
        GROUP BY start
        ORDER BY start ASC;`;

  let currentDate = startFunction(
    DateTime.fromJSDate(startDate).setZone(timezone || "UTC"),
  );

  const commissionsLookup = Object.fromEntries(
    commissions.map((item) => [
      item.start,
      {
        commissions: Number(item.commissions),
        revenue: Number(item.revenue),
      },
    ]),
  );

  const timeseries: Commission[] = [];

  while (currentDate < endDate) {
    const periodKey = currentDate.toFormat(formatString);

    timeseries.push({
      start: currentDate.toISO(),
      ...(commissionsLookup[periodKey] || {
        commissions: 0,
        revenue: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return timeseries;
}
