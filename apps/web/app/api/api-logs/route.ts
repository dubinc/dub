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
    });

    return NextResponse.json(logs);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
