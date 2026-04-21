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

    const { startDate } = getApiLogsDateRange({
      plan: workspace.plan,
    });

    if (new Date(log.timestamp) < new Date(startDate)) {
      throw new DubApiError({
        code: "not_found",
        message:
          "API log is past your current plan's retention period. Upgrade your plan to view more logs.",
      });
    }

    const enrichedLog = await enrichApiLogs({
      logs: log,
      workspace,
    });

    return NextResponse.json(enrichedLog);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
