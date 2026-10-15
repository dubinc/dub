import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { adminCommissionsDataSchema } from "@/lib/zod/schemas/admin";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { DUB_FOUNDING_DATE } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { getCommissionsTimeseries } from "./get-commissions-timeseries";
import { getTopPartnersByCommissions } from "./get-top-partners-by-commissions";
import { getTopProgramsByCommissions } from "./get-top-program-by-commissions";

const adminCommissionsQuerySchema = z
  .object({
    programId: z.string().optional(),
    partnerId: z.string().optional(),
    groupBy: z.enum(["programId", "partnerId"]).optional().default("programId"),
    timezone: z.string().optional().default("UTC"),
  })
  .extend(
    analyticsQuerySchema.pick({ interval: true, start: true, end: true }).shape,
  );

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    programId,
    partnerId,
    groupBy,
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

  const filters = { programId, partnerId, startDate, endDate };

  if (groupBy === "partnerId") {
    const [partners, timeseries] = await Promise.all([
      getTopPartnersByCommissions(filters),
      getCommissionsTimeseries({
        ...filters,
        granularity,
        timezone,
      }),
    ]);

    return NextResponse.json(
      adminCommissionsDataSchema.parse({
        partners,
        timeseries,
      }),
    );
  }

  const [programs, timeseries] = await Promise.all([
    getTopProgramsByCommissions(filters),
    getCommissionsTimeseries({
      ...filters,
      granularity,
      timezone,
    }),
  ]);

  return NextResponse.json(
    adminCommissionsDataSchema.parse({
      programs,
      timeseries,
    }),
  );
});
