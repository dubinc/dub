import { getAnalytics } from "@/lib/analytics";
import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import {
  analyticsEndpointSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/[endpoint] – get analytics for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, workspace, link }) => {
    const { endpoint } = analyticsEndpointSchema.parse(params);
    const parsedParams = getAnalyticsQuerySchema.parse(searchParams);
    const { domain, key, interval } = parsedParams;

    // return 403 if workspace is on the free plan and interval is 90d or all
    if (
      workspace?.plan === "free" &&
      (interval === "all" || interval === "90d")
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "Require higher plan",
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
