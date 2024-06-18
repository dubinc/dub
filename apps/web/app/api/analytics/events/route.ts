import { getEvents } from "@/lib/analytics/get-events";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ searchParams, workspace, link }) => {
    const parsedParams = eventsQuerySchema.parse(searchParams);

    let { event, interval, start, end } = parsedParams;

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    const linkId = link ? link.id : null;

    const response = await getEvents({
      ...parsedParams,
      event,
      ...(linkId && { linkId }),
      workspaceId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
    betaFeature: true,
  },
);
