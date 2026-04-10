import { getApiLogsStartDate } from "@/lib/api-logs/api-log-retention";
import { getApiLogsCount } from "@/lib/api-logs/get-api-logs-count";
import { getApiLogsCountQuerySchema } from "@/lib/api-logs/schemas";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/api-logs/count
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const filters = getApiLogsCountQuerySchema.parse(searchParams);

    const count = await getApiLogsCount({
      ...filters,
      workspaceId: workspace.id,
      start: getApiLogsStartDate(workspace.plan),
    });

    return NextResponse.json(count);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
