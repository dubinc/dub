import { getClicks } from "@/lib/analytics/clicks";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getLink } from "@/lib/api/links/get-link";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import {
  analyticsEndpointSchema,
  clickAnalyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/clicks/[endpoint] – get click analytics
export const GET = withWorkspace(
  async ({ params, searchParams, workspace }) => {
    const { endpoint = "count" } = analyticsEndpointSchema.parse(params);
    const parsedParams = clickAnalyticsQuerySchema.parse(searchParams);
    const { linkId, externalId, domain, key, interval, start, end } =
      parsedParams;

    const link = await getLink({
      workspaceId: workspace.id,
      linkId,
      externalId,
      domain,
      key,
    });

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    const id = link
      ? link.id
      : domain && key === "_root"
        ? await getDomainViaEdge(domain).then((d) => d?.id)
        : null;

    const response = await getClicks({
      ...parsedParams,
      endpoint,
      ...(id && { linkId: id }),
      workspaceId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
