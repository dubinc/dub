import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { THE_BEGINNING_OF_TIME } from "@dub/utils";
import { NextResponse } from "next/server";
import { getCommissionsTimeseries, getTopProgramsByCommissions } from "./utils";

export const GET = withAdmin(async ({ searchParams }) => {
  const { interval = "mtd", start, end, timezone = "UTC" } = searchParams;

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: THE_BEGINNING_OF_TIME,
  });

  const [programs, timeseries] = await Promise.all([
    getTopProgramsByCommissions({ startDate, endDate }),
    getCommissionsTimeseries({ startDate, endDate, granularity, timezone }),
  ]);

  return NextResponse.json({
    programs,
    timeseries,
  });
});
