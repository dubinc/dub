import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/analytics - get analytics for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const parsedParams = analyticsQuerySchema
      .pick({
        event: true,
        start: true,
        end: true,
        interval: true,
        groupBy: true,
        timezone: true,
      })
      .parse(searchParams);

    const analytics = await getAnalytics({
      ...parsedParams,
      workspaceId: workspace.id,
      programId,
    });

    return NextResponse.json(analytics);
  },
);
