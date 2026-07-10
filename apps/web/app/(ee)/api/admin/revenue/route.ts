import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { DUB_FOUNDING_DATE } from "@dub/utils";
import { subMonths } from "date-fns";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { getPayoutsTimeseries } from "../payouts/get-payouts-timeseries";
import { getBucketKey, getMrrByBucket } from "./get-mrr-timeseries";
import { computeRollingAveragePayoutFees } from "./get-rolling-payout-fees";

const adminRevenueQuerySchema = z
  .object({})
  .extend(
    analyticsQuerySchema.pick({ interval: true, start: true, end: true }).shape,
  );

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    interval = "30d",
    start,
    end,
  } = adminRevenueQuerySchema.parse(searchParams);

  const timezone = "UTC";
  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: DUB_FOUNDING_DATE,
    timezone,
  });

  const revenueGranularity = granularity === "month" ? "month" : "day";
  const payoutHistoryStartDate = subMonths(startDate, 6);

  const [mrrLookup, payoutTimeseriesWithHistory] = await Promise.all([
    getMrrByBucket({
      startDate,
      endDate,
      granularity: revenueGranularity,
    }).catch((error) => {
      console.error(error);
      return new Map<string, number>();
    }),
    getPayoutsTimeseries({
      startDate: payoutHistoryStartDate,
      endDate,
      granularity: revenueGranularity,
      timezone,
      excludeCreditCardFees: true,
    }),
  ]);

  const rollingAveragePayoutFees = computeRollingAveragePayoutFees(
    payoutTimeseriesWithHistory,
  );

  const timeseries = payoutTimeseriesWithHistory
    .map(({ date }, index) => {
      const mrr = mrrLookup.get(getBucketKey(date, revenueGranularity)) ?? 0;
      const payoutFees = rollingAveragePayoutFees[index];
      return {
        date,
        mrr,
        payoutFees,
        totalRevenue: mrr + payoutFees,
      };
    })
    .filter(({ date }) => date >= startDate);

  return NextResponse.json({
    timeseries,
  });
});
