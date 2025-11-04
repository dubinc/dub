import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { DateTime } from "luxon";

interface Commission {
  start: string;
  commissions: number;
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
          SUM(earnings) AS commissions
        FROM Commission
        WHERE 
          programId != ${ACME_PROGRAM_ID}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
          AND status IN ("pending", "processed", "paid")
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
      },
    ]),
  );

  const timeseries: Commission[] = [];

  while (currentDate.toJSDate() < endDate) {
    const periodKey = currentDate.toFormat(formatString);

    timeseries.push({
      start: currentDate.toISO()!,
      ...(commissionsLookup[periodKey] || {
        commissions: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }
  return timeseries;
}
