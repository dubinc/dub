import {
  DEPRECATED_ANALYTICS_ENDPOINTS,
  OLD_TO_NEW_ANALYTICS_ENDPOINTS,
} from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

const schema = z.object({
  eventType: z
    .enum(DEPRECATED_ANALYTICS_ENDPOINTS, {
      errorMap: (_issue, _ctx) => {
        return {
          message: `Invalid endpoint value. Valid values are: ${DEPRECATED_ANALYTICS_ENDPOINTS.join(", ")}`,
        };
      },
    })
    .describe("The parameter to group the analytics data points by."),
});

// GET /api/analytics/{endpoint} – get analytics (Deprecated)
export const GET = withWorkspace(
  async ({ params, searchParams, workspace, link }) => {
    let { eventType: endpoint } = schema.parse(params);
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

    const response = await getAnalytics({
      ...parsedParams,
      ...(linkId && { linkId }),
      event: "clicks",
      groupBy: OLD_TO_NEW_ANALYTICS_ENDPOINTS[endpoint],
      workspaceId: workspace.id,
      isDeprecatedEndpoint: true,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
