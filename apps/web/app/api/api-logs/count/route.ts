import { getApiLogsCount } from "@/lib/api-logs/get-api-logs";
import { getApiLogsQuerySchema } from "@/lib/api-logs/schemas";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/api-logs/count
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const filters = getApiLogsQuerySchema.parse(searchParams);

    const count = await getApiLogsCount({
      ...filters,
      workspaceId: workspace.id,
      start: new Date().toUTCString(),
      end: new Date().toISOString(),
    });

    return NextResponse.json(count);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
