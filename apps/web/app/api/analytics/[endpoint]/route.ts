import { getAnalytics, validDateRangeForPlan } from "@/lib/analytics";
import { DubApiError } from "@/lib/api/errors";
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

    const { domain, key, interval, start, end } = parsedParams;

    // Either interval can be provided, or both start and end date
    if ((interval && start && end) || (start && !end) || (!start && end)) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Either provide interval or start and end date, not both",
      });
    }

    // Free plan users can only get analytics for 30 days
    if (
      workspace.plan === "free" &&
      !validDateRangeForPlan({
        plan: workspace.plan,
        interval,
        start,
        end,
      })
    ) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only get analytics for up to 30 days on a Free plan. Upgrade to Pro or Business to get analytics for longer periods.",
      });
    }

    // Pro plan users can only get analytics for 1 year
    if (
      workspace.plan === "pro" &&
      !validDateRangeForPlan({
        plan: workspace.plan,
        interval,
        start,
        end,
      })
    ) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only get analytics for up to 1 year on a Pro plan. Upgrade to Business to get analytics for longer periods.",
      });
    }

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
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
