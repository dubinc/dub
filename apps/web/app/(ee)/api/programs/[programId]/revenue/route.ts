import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
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
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const parsedParams = querySchema.parse(searchParams);
  const { interval } = parsedParams;

  const response = await getAnalytics({
    ...parsedParams,
    workspaceId: workspace.id,
    programId,
    dataAvailableFrom:
      // ideally we should get the first commission event date for dataAvailableFrom
      interval === "all"
        ? await getProgramOrThrow({
            workspaceId: workspace.id,
            programId,
          }).then((program) => program.createdAt)
        : undefined,
  });

  const timeseries = response.map((item) => ({
    start: item.start,
    saleAmount: item.saleAmount,
  }));

  return NextResponse.json(timeseries);
});
