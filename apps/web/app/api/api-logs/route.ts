import { getApiLogsStartDate } from "@/lib/api-logs/api-log-retention";
import { enrichApiLogs } from "@/lib/api-logs/enrich-api-logs";
import { getApiLogs } from "@/lib/api-logs/get-api-logs";
import { getApiLogsQuerySchema } from "@/lib/api-logs/schemas";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/api-logs
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const filters = getApiLogsQuerySchema.parse(searchParams);

    const logs = await getApiLogs({
      ...filters,
      workspaceId: workspace.id,
      start: getApiLogsStartDate(workspace.plan),
    });

    return NextResponse.json(await enrichApiLogs(logs));
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
