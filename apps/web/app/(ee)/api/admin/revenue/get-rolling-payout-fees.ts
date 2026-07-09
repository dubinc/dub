import { subMonths } from "date-fns";

export const ROLLING_PAYOUT_FEES_WINDOW_MONTHS = 6;

export function computeRollingAveragePayoutFees(
  timeseries: { date: Date; fees: number }[],
  windowMonths = ROLLING_PAYOUT_FEES_WINDOW_MONTHS,
): number[] {
  const averages: number[] = [];
  let windowSum = 0;
  let windowStartIdx = 0;

  for (let i = 0; i < timeseries.length; i++) {
    const windowStart = subMonths(timeseries[i].date, windowMonths);

    while (
      windowStartIdx < i &&
      timeseries[windowStartIdx].date < windowStart
    ) {
      windowSum -= timeseries[windowStartIdx].fees;
      windowStartIdx++;
    }

    windowSum += timeseries[i].fees;
    averages.push(windowSum / windowMonths);
  }

  return averages;
}
