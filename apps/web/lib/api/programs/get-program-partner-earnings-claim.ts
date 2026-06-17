import { prisma } from "@dub/prisma";
import { CommissionStatus, Prisma } from "@dub/prisma/client";
import { nFormatter } from "@dub/utils";

const LOOKBACK_MONTHS = 6;
const MIN_DISTINCT_EARNING_PARTNERS = 5;
const MIN_MONTHLY_EARNINGS_CENTS = 100_000;
const ROUNDING_INCREMENT_CENTS = 100_000;
const MONTH_SQL_DATE_FORMAT = "%Y-%m";
const EARNINGS_STATUSES = [CommissionStatus.processed, CommissionStatus.paid];

// MySQL aggregate result types vary by function, so raw query values need
// normalization before applying thresholds.
type EarningsAmount = Prisma.Decimal | bigint | number | string | null;

type TopMonthlyEarningsCentsRow = {
  monthlyEarningsCents: EarningsAmount;
};

type DistinctEarningPartnerCountRow = {
  distinctEarningPartnerCount: bigint | number;
};

function getUtcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getLookbackUtcMonthRange(date = new Date()) {
  const endDate = getUtcMonthStart(date);
  const startDate = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth() - LOOKBACK_MONTHS,
      1,
    ),
  );

  return { startDate, endDate };
}

function toNumber(value: EarningsAmount | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function formatProgramPartnerEarningsClaim({
  topMonthlyEarningsCents,
  distinctEarningPartnerCount,
}: {
  topMonthlyEarningsCents: EarningsAmount | undefined;
  distinctEarningPartnerCount: EarningsAmount | undefined;
}) {
  if (toNumber(distinctEarningPartnerCount) < MIN_DISTINCT_EARNING_PARTNERS) {
    return null;
  }

  const monthlyEarningsCents = toNumber(topMonthlyEarningsCents);
  const flooredMonthlyEarningsCents =
    Math.floor(monthlyEarningsCents / ROUNDING_INCREMENT_CENTS) *
    ROUNDING_INCREMENT_CENTS;

  if (flooredMonthlyEarningsCents < MIN_MONTHLY_EARNINGS_CENTS) {
    return null;
  }

  const displayEarningsDollars = floorToCompactDisplayUnit(
    flooredMonthlyEarningsCents / 100,
  );
  const displayEarningsCents = displayEarningsDollars * 100;
  const earningsPrefix =
    monthlyEarningsCents > displayEarningsCents ? "over " : "";

  return `In recent months, some of our top partners have earned ${earningsPrefix}$${nFormatter(
    displayEarningsDollars,
    { digits: 0 },
  )} in a month.`;
}

// nFormatter rounds to the nearest unit (e.g. $2.5M -> "$3M"), which would
// overstate an "earned over $X" claim. Floor to the same unit nFormatter will
// display so the shown figure can never exceed the real amount.
function floorToCompactDisplayUnit(dollars: number) {
  const unit =
    dollars >= 1e9 ? 1e9 : dollars >= 1e6 ? 1e6 : dollars >= 1e3 ? 1e3 : 1;
  return Math.floor(dollars / unit) * unit;
}

export async function getProgramPartnerEarningsClaim(programId: string) {
  const { startDate, endDate } = getLookbackUtcMonthRange();
  const earningsWhere = Prisma.sql`
    programId = ${programId}
    AND status IN (${Prisma.join(EARNINGS_STATUSES)})
    AND createdAt >= ${startDate}
    AND createdAt < ${endDate}
    AND earnings > 0
    AND currency = ${"usd"}
  `;

  const [topMonthlyEarningsCentsRows, distinctEarningPartnerCountRows] =
    await Promise.all([
      prisma.$queryRaw<TopMonthlyEarningsCentsRow[]>(Prisma.sql`
        SELECT SUM(earnings) AS monthlyEarningsCents
        FROM Commission
        WHERE ${earningsWhere}
        GROUP BY partnerId, DATE_FORMAT(createdAt, ${MONTH_SQL_DATE_FORMAT})
        ORDER BY monthlyEarningsCents DESC
        LIMIT 1
      `),
      prisma.$queryRaw<DistinctEarningPartnerCountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT partnerId) AS distinctEarningPartnerCount
        FROM Commission
        WHERE ${earningsWhere}
      `),
    ]);

  return formatProgramPartnerEarningsClaim({
    topMonthlyEarningsCents:
      topMonthlyEarningsCentsRows[0]?.monthlyEarningsCents,
    distinctEarningPartnerCount:
      distinctEarningPartnerCountRows[0]?.distinctEarningPartnerCount,
  });
}
