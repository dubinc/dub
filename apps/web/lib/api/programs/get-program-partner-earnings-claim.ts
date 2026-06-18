import { prisma } from "@/lib/prisma";
import { nFormatter } from "@dub/utils";
import { CommissionStatus } from "@prisma/client";

const LOOKBACK_MONTHS = 6;
const MIN_DISTINCT_EARNING_PARTNERS = 2;
const MIN_MONTHLY_EARNINGS_CENTS = 100_000;
const ROUNDING_INCREMENT_CENTS = 100_000;
const EARNINGS_STATUSES = [CommissionStatus.processed, CommissionStatus.paid];

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

// Complete months between the earliest earning and the window end, capped at
// LOOKBACK_MONTHS and floored at 1. Used as the average's divisor so an earner
// younger than the window isn't diluted by months before they started earning.
export function getActiveMonthCount(earliestEarningAt: Date, endDate: Date) {
  const earliestMonth = getUtcMonthStart(earliestEarningAt);
  const monthsElapsed =
    (endDate.getUTCFullYear() - earliestMonth.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - earliestMonth.getUTCMonth());

  return Math.min(Math.max(monthsElapsed, 1), LOOKBACK_MONTHS);
}

export function formatProgramPartnerEarningsClaim({
  avgMonthlyEarningsCents,
  distinctEarningPartnerCount,
}: {
  avgMonthlyEarningsCents: number;
  distinctEarningPartnerCount: number;
}) {
  if (distinctEarningPartnerCount < MIN_DISTINCT_EARNING_PARTNERS) {
    return null;
  }

  const flooredMonthlyEarningsCents =
    Math.floor(avgMonthlyEarningsCents / ROUNDING_INCREMENT_CENTS) *
    ROUNDING_INCREMENT_CENTS;

  if (flooredMonthlyEarningsCents < MIN_MONTHLY_EARNINGS_CENTS) {
    return null;
  }

  const displayEarningsDollars = floorToCompactDisplayUnit(
    flooredMonthlyEarningsCents / 100,
  );
  const displayEarningsCents = displayEarningsDollars * 100;
  const earningsPrefix =
    avgMonthlyEarningsCents > displayEarningsCents ? "over " : "";

  return `Some of our top partners earn ${earningsPrefix}$${nFormatter(
    displayEarningsDollars,
    { digits: 0 },
  )} per month on average.`;
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

  // One earner per group, ordered by lookback-window total. The top group is
  // the top-earning partner, and the group count is the distinct-partner guard.
  const partnerEarnings = await prisma.commission.groupBy({
    by: ["partnerId"],
    where: {
      programId,
      status: { in: EARNINGS_STATUSES },
      createdAt: { gte: startDate, lt: endDate },
      earnings: { gt: 0 },
      currency: "usd",
    },
    _sum: { earnings: true },
    _min: { createdAt: true },
    orderBy: { _sum: { earnings: "desc" } },
  });

  const topPartner = partnerEarnings[0];
  const topPartnerLookbackEarningsCents = topPartner?._sum.earnings ?? 0;

  // Divide by the months the top partner has actually been earning, not a flat
  // LOOKBACK_MONTHS, so a top earner who started mid-window isn't diluted by
  // months before they began earning.
  const activeMonths = topPartner?._min.createdAt
    ? getActiveMonthCount(topPartner._min.createdAt, endDate)
    : LOOKBACK_MONTHS;

  return formatProgramPartnerEarningsClaim({
    avgMonthlyEarningsCents: topPartnerLookbackEarningsCents / activeMonths,
    distinctEarningPartnerCount: partnerEarnings.length,
  });
}
