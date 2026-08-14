import { getApiLogsDateRange } from "@/lib/api-logs/api-log-retention";
import { getApiLogsTimeseries } from "@/lib/api-logs/get-api-logs-timeseries";
import { getApiLogsTimeseriesQuerySchema } from "@/lib/api-logs/schemas";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/logs/timeseries
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { start, end, interval, timezone, exactRange, ...filters } =
      getApiLogsTimeseriesQuerySchema.parse(searchParams);

    const { startDate, endDate, granularity } = getApiLogsDateRange({
      plan: workspace.plan,
      start,
      end,
      interval,
      timezone,
      exactRange: Boolean(exactRange),
    });

    const rows = await getApiLogsTimeseries({
      ...filters,
      start: startDate,
      end: endDate,
      timezone: timezone ?? "UTC",
      granularity,
      workspaceId: workspace.id,
    });

    return NextResponse.json(rows);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
