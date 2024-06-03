import { getAnalytics } from "@/lib/analytics/get-analytics";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getLink } from "@/lib/api/links/get-link";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import {
  analyticsPathParamsSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics – get analytics
export const GET = withWorkspace(
  async ({ params, searchParams, workspace }) => {
    const { eventType: oldEvent, endpoint: oldType } =
      analyticsPathParamsSchema.parse(params);
    const parsedParams = analyticsQuerySchema.parse(searchParams);

    let { event, groupBy, domain, key, interval, start, end, linkId } =
      parsedParams;

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    let id: string | undefined = undefined;

    // For a link
    if (linkId) {
      const link = await getLink({
        workspaceId: workspace.id,
        ...searchParams,
      });

      id = link.id;
    }

    // For a domain
    if (!id && domain && key === "_root") {
      const domainRecord = await getDomainViaEdge(domain);

      id = domainRecord?.id;
    }

    // Identify the request is from deprecated endpoint
    // (/api/analytics/clicks)
    // (/api/analytics/clicks/count)
    const isDeprecatedEndpoint =
      oldEvent && oldEvent === "clicks" && (!oldType || oldType === "count");

    const response = await getAnalytics({
      ...parsedParams,
      event,
      groupBy,
      ...(id && { linkId: id }),
      workspaceId: workspace.id,
      isDeprecatedEndpoint,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
