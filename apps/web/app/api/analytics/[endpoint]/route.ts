import { getAnalytics, validDateRangeForPlan } from "@/lib/analytics";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import {
  analyticsEndpointSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/analytics/[endpoint] – get analytics for a specific endpoint
export const GET = withWorkspace(
  async ({ params, searchParams, workspace, link }) => {
    const { endpoint } = analyticsEndpointSchema.parse(params);
    const parsedParams = getAnalyticsQuerySchema.parse(searchParams);

    let { domain, key, interval, start, end } = parsedParams;

    // swap start and end if start is greater than end
    if (start && end && start > end) {
      [start, end] = [end, start];
    }

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    const linkId = link
      ? link.id
      : domain && key === "_root"
        ? await getDomainViaEdge(domain).then((d) => d?.id)
        : null;

    const response = await getAnalytics({
      workspaceId: workspace.id,
      ...(linkId && { linkId }),
      endpoint,
      ...parsedParams,
      start,
      end,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
