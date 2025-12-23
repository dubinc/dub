import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { TZDate } from "@date-fns/tz";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { format } from "date-fns";

interface Commission {
  start: string;
  commissions: number;
}

export async function getCommissionsTimeseries({
  programId,
  startDate,
  endDate,
  granularity,
  timezone,
}: {
  programId?: string;
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
          ${programId ? Prisma.sql`programId = ${programId}` : Prisma.sql`programId != ${ACME_PROGRAM_ID}`}
          AND createdAt >= ${startDate}
          AND createdAt < ${endDate}
          AND status IN ("pending", "processed", "paid")
        GROUP BY start
        ORDER BY start ASC;`;

  // Convert dates to TZDate with the specified timezone
  const tzStartDate = new TZDate(startDate, timezone || "UTC");
  const tzEndDate = new TZDate(endDate, timezone || "UTC");

  let currentDate = startFunction(tzStartDate);

  const commissionsLookup = Object.fromEntries(
    commissions.map((item) => [
      item.start,
      {
        commissions: Number(item.commissions),
      },
    ]),
  );

  const timeseries: Commission[] = [];

  while (currentDate < tzEndDate) {
    const periodKey = format(currentDate, formatString);

    timeseries.push({
      start: currentDate.toISOString(),
      ...(commissionsLookup[periodKey] || {
        commissions: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }
  return timeseries;
}
