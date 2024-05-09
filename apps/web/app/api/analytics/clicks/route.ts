import { getClicks, validDateRangeForPlan } from "@/lib/analytics";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { clickAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/analytics/clicks – get click analytics
export const GET = withWorkspace(
  async ({ params, searchParams, workspace, link }) => {
    let { groupBy: oldGroupBy } = clickAnalyticsQuerySchema.parse(params);

    const parsedParams = clickAnalyticsQuerySchema.parse(searchParams);

    let { groupBy, domain, key, interval, start, end } = parsedParams;

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

    const response = await getClicks({
      ...parsedParams,
      groupBy: groupBy || oldGroupBy,
      ...(linkId && { linkId }),
      workspaceId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
