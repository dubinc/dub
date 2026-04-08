import { getApiLogById } from "@/lib/api-logs/get-api-logs";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth/workspace";
import { NextResponse } from "next/server";

// GET /api/api-logs/:logId
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

    return NextResponse.json(log);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
