import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { THE_BEGINNING_OF_TIME } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { getTopProgramsBySales } from "./get-top-programs-by-sales";

export const GET = withAdmin(async ({ searchParams }) => {
  const { interval = "mtd", start, end } = searchParams;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start: start ? startOfDay(new Date(start)) : undefined,
    end: end ? endOfDay(new Date(end)) : undefined,
    dataAvailableFrom: THE_BEGINNING_OF_TIME,
  });

  const programs = await getTopProgramsBySales({
    startDate,
    endDate,
  });

  return NextResponse.json({
    programs,
  });
});
