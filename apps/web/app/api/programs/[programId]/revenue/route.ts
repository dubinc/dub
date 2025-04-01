import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

const querySchema = analyticsQuerySchema.pick({
  start: true,
  end: true,
  interval: true,
  timezone: true,
  event: true,
  groupBy: true,
});

// GET /api/programs/[programId]/revenue - get revenue timeseries for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: params.programId,
    });

    const parsedParams = querySchema.parse(searchParams);

    const response = await getAnalytics({
      ...parsedParams,
      workspaceId: workspace.id,
      programId: program.id,
    });

    const timeseries = response.map((item) => ({
      start: item.start,
      saleAmount: item.saleAmount,
    }));

    return NextResponse.json(timeseries);
  },
);
