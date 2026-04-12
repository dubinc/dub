import { getApiLogsDateRange } from "@/lib/api-logs/api-log-retention";
import { enrichApiLogs } from "@/lib/api-logs/enrich-api-logs";
import { getApiLogById } from "@/lib/api-logs/get-api-log";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/logs/:logId
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const log = await getApiLogById({
      workspaceId: workspace.id,
      id: params.logId,
    });

    if (!log) {
      throw new DubApiError({
        code: "not_found",
        message: "API log not found.",
      });
    }

    const { start } = getApiLogsDateRange(workspace.plan);

    if (new Date(log.timestamp) < new Date(start)) {
      throw new DubApiError({
        code: "not_found",
        message: "API log not found.",
      });
    }

    return NextResponse.json(await enrichApiLogs(log));
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
