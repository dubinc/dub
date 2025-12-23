import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { DUB_FOUNDING_DATE } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommissionsTimeseries } from "./get-commissions-timeseries";
import { getTopProgramsByCommissions } from "./get-top-program-by-commissions";

const adminCommissionsQuerySchema = z
  .object({
    programId: z.string().optional(),
    timezone: z.string().optional().default("UTC"),
  })
  .merge(analyticsQuerySchema.pick({ interval: true, start: true, end: true }));

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    programId,
    interval = "mtd",
    start,
    end,
    timezone = "UTC",
  } = adminCommissionsQuerySchema.parse(searchParams);

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start: start ? startOfDay(new Date(start)) : undefined,
    end: end ? endOfDay(new Date(end)) : undefined,
    dataAvailableFrom: DUB_FOUNDING_DATE,
    timezone,
  });

  const [programs, timeseries] = await Promise.all([
    getTopProgramsByCommissions({ programId, startDate, endDate }),
    getCommissionsTimeseries({
      programId,
      startDate,
      endDate,
      granularity,
      timezone,
    }),
  ]);

  return NextResponse.json({
    programs,
    timeseries,
  });
});
