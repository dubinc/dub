import { getApiLogsDateRange } from "@/lib/api-logs/api-log-retention";
import { getApiLogsCount } from "@/lib/api-logs/get-api-logs-count";
import { getApiLogsCountQuerySchema } from "@/lib/api-logs/schemas";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/logs/count
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { start, end, interval, ...filters } =
      getApiLogsCountQuerySchema.parse(searchParams);

    const { startDate, endDate } = getApiLogsDateRange({
      plan: workspace.plan,
      start,
      end,
      interval,
    });

    const rows = await getApiLogsCount({
      ...filters,
      start: startDate,
      end: endDate,
      workspaceId: workspace.id,
    });

    return NextResponse.json(rows);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
