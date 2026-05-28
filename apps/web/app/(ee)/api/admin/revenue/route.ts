import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { DUB_FOUNDING_DATE } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { getPayoutsTimeseries } from "../payouts/get-payouts-timeseries";
import { getBucketKey, getMrrByBucket } from "./get-mrr-timeseries";

const adminRevenueQuerySchema = z
  .object({})
  .extend(
    analyticsQuerySchema.pick({ interval: true, start: true, end: true }).shape,
  );

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    interval = "mtd",
    start,
    end,
  } = adminRevenueQuerySchema.parse(searchParams);

  const timezone = "UTC";
  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start: start ? startOfDay(new Date(start)) : undefined,
    end: end ? endOfDay(new Date(end)) : undefined,
    dataAvailableFrom: DUB_FOUNDING_DATE,
    timezone,
  });

  const revenueGranularity = granularity === "month" ? "month" : "day";

  const [mrrLookup, payoutTimeseries] = await Promise.all([
    getMrrByBucket({
      startDate,
      endDate,
      granularity: revenueGranularity,
    }).catch((error) => {
      console.error(error);
      return new Map<string, number>();
    }),
    getPayoutsTimeseries({
      startDate,
      endDate,
      granularity: revenueGranularity,
      timezone,
    }),
  ]);

  console.log({ payoutTimeseries });

  const timeseries = payoutTimeseries.map(({ date, fees }) => {
    const mrr = mrrLookup.get(getBucketKey(date, revenueGranularity)) ?? 0;
    return {
      date,
      mrr,
      payoutFees: fees,
      totalRevenue: mrr + fees,
    };
  });

  console.log({ timeseries });

  return NextResponse.json({
    timeseries,
  });
});
