import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withWorkspace } from "@/lib/auth";
import { tb } from "@/lib/tinybird";
import { usageQuerySchema, usageResponse } from "@/lib/zod/schemas/usage";
import { subYears } from "date-fns/subYears";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = withWorkspace(async ({ searchParams, workspace }) => {
  const { resource, folderId, domain, interval, start, end, timezone } =
    usageQuerySchema.parse(searchParams);

  const pipe = tb.buildPipe({
    pipe: "v3_usage",
    // we extend this here since we don't need to include all the additional parameters
    // in the actual request query schema
    parameters: usageQuerySchema.extend({
      workspaceId: z.string(),
    }),
    data: usageResponse,
  });

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: subYears(new Date(), 1),
    timezone,
  });

  const response = await pipe({
    resource,
    workspaceId: workspace.id,
    start: startDate.toISOString().replace("T", " ").replace("Z", ""),
    end: endDate.toISOString().replace("T", " ").replace("Z", ""),
    timezone,
    ...(folderId && { folderId }),
    ...(domain && { domain }),
  });

  return NextResponse.json(response.data);
});
