import { getApiLogsDateRange } from "@/lib/api-logs/api-log-retention";
import { enrichApiLogs } from "@/lib/api-logs/enrich-api-logs";
import { getApiLogs } from "@/lib/api-logs/get-api-logs";
import { getApiLogsQuerySchema } from "@/lib/api-logs/schemas";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/logs
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { start, end, interval, ...filters } =
      getApiLogsQuerySchema.parse(searchParams);

    const { startDate, endDate } = getApiLogsDateRange({
      plan: workspace.plan,
      start,
      end,
      interval,
    });

    const logs = await getApiLogs({
      ...filters,
      start: startDate,
      end: endDate,
      workspaceId: workspace.id,
    });

    const enrichedLogs = await enrichApiLogs({
      logs,
      workspace,
    });

    return NextResponse.json(enrichedLogs);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
