import { getLeads } from "@/lib/analytics/get-leads";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { analyticsEndpointSchema } from "@/lib/zod/schemas/clicks-analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/leads/[endpoint] – get leads analytics
export const GET = withWorkspace(
  async ({ params, searchParams, workspace, link }) => {
    const { endpoint } = analyticsEndpointSchema.parse(params);
    const parsedParams = analyticsQuerySchema.parse(searchParams);

    const { domain, key, interval, start, end } = parsedParams;

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

    const response = await getLeads({
      ...parsedParams,
      endpoint,
      ...(linkId && { linkId }),
      workspaceId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
