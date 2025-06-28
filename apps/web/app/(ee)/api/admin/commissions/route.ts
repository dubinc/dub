import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { THE_BEGINNING_OF_TIME } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { getCommissionsTimeseries } from "./get-commissions-timeseries";
import { getTopProgramsByCommissions } from "./get-top-program-by-commissions";

export const GET = withAdmin(async ({ searchParams }) => {
  const { interval = "mtd", start, end, timezone = "UTC" } = searchParams;

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start: start ? startOfDay(new Date(start)) : undefined,
    end: end ? endOfDay(new Date(end)) : undefined,
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
