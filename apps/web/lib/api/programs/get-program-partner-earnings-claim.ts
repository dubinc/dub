import { prisma } from "@dub/prisma";
import { CommissionStatus, Prisma } from "@dub/prisma/client";
import { nFormatter } from "@dub/utils";

const LOOKBACK_MONTHS = 6;
const MIN_DISTINCT_EARNING_PARTNERS = 5;
const MIN_MONTHLY_EARNINGS_CENTS = 100_000;
const ROUNDING_INCREMENT_CENTS = 100_000;
const MONTH_SQL_DATE_FORMAT = "%Y-%m";
const EARNINGS_STATUSES = [CommissionStatus.processed, CommissionStatus.paid];

// MySQL SUM() over an Int column returns DECIMAL, which Prisma surfaces as a
// Prisma.Decimal (not bigint/number) through $queryRaw
type EarningsAmount = Prisma.Decimal | bigint | number | string | null;

type TopMonthlyEarningsRow = {
  monthlyEarnings: EarningsAmount;
};

type DistinctEarningPartnersRow = {
  // COUNT(DISTINCT ...) comes back as BIGINT -> bigint
  partnerCount: bigint | number;
};

function getUtcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getLastCompleteUtcMonthRange(date = new Date()) {
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
  // Prisma.Decimal coerces via its string valueOf(); bigint/number/string all
  // pass through Number() safely
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function formatProgramPartnerEarningsClaim({
  topMonthlyEarnings,
  distinctEarningPartners,
}: {
  topMonthlyEarnings: EarningsAmount | undefined;
  distinctEarningPartners: EarningsAmount | undefined;
}) {
  if (toNumber(distinctEarningPartners) < MIN_DISTINCT_EARNING_PARTNERS) {
    return null;
  }

  const roundedMonthlyEarnings =
    Math.floor(toNumber(topMonthlyEarnings) / ROUNDING_INCREMENT_CENTS) *
    ROUNDING_INCREMENT_CENTS;

  if (roundedMonthlyEarnings < MIN_MONTHLY_EARNINGS_CENTS) {
    return null;
  }

  return `In recent months, some of our top partners have earned over $${nFormatter(
    roundedMonthlyEarnings / 100,
    { digits: 0 },
  )} in a month.`;
}

export async function getProgramPartnerEarningsClaim(programId: string) {
  const { startDate, endDate } = getLastCompleteUtcMonthRange();
  const earningsWhere = Prisma.sql`
    programId = ${programId}
    AND status IN (${Prisma.join(EARNINGS_STATUSES)})
    AND createdAt >= ${startDate}
    AND createdAt < ${endDate}
    AND earnings > 0
    AND currency = ${"usd"}
  `;

  const [topMonthlyEarningsRows, distinctEarningPartnersRows] =
    await Promise.all([
      prisma.$queryRaw<TopMonthlyEarningsRow[]>(Prisma.sql`
        SELECT SUM(earnings) AS monthlyEarnings
        FROM Commission
        WHERE ${earningsWhere}
        GROUP BY partnerId, DATE_FORMAT(createdAt, ${MONTH_SQL_DATE_FORMAT})
        ORDER BY monthlyEarnings DESC
        LIMIT 1
      `),
      prisma.$queryRaw<DistinctEarningPartnersRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT partnerId) AS partnerCount
        FROM Commission
        WHERE ${earningsWhere}
      `),
    ]);

  return formatProgramPartnerEarningsClaim({
    topMonthlyEarnings: topMonthlyEarningsRows[0]?.monthlyEarnings,
    distinctEarningPartners: distinctEarningPartnersRows[0]?.partnerCount,
  });
}
