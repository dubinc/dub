import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { throwIfDomainNotOwned } from "@/lib/api/domains/get-domain";
import { getLink } from "@/lib/api/links/get-link";
import { withWorkspace } from "@/lib/auth";
import {
  analyticsPathParamsSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics – get analytics
export const GET = withWorkspace(
  async ({ params, searchParams, workspace }) => {
    let { eventType: oldEvent, endpoint: oldType } =
      analyticsPathParamsSchema.parse(params);

    // for backwards compatibility (we used to support /analytics/[endpoint] as well)
    if (!oldType && oldEvent && VALID_ANALYTICS_ENDPOINTS.includes(oldEvent)) {
      oldType = oldEvent;
      oldEvent = undefined;
    }

    const parsedParams = analyticsQuerySchema.parse(searchParams);

    let {
      event,
      groupBy,
      interval,
      start,
      end,
      linkId,
      externalId,
      domain,
      key,
    } = parsedParams;

    if (domain) {
      throwIfDomainNotOwned({ workspace, domain });
    }

    const shouldCheckLink = linkId || externalId || (domain && key);
    const link = shouldCheckLink
      ? await getLink({ workspace: workspace, linkId, externalId, domain, key })
      : null;

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    // Identify the request is from deprecated clicks endpoint
    // (/api/analytics/clicks)
    // (/api/analytics/count)
    // (/api/analytics/clicks/clicks)
    // (/api/analytics/clicks/count)
    const isDeprecatedClicksEndpoint =
      oldEvent === "clicks" || oldType === "count";

    const response = await getAnalytics({
      ...parsedParams,
      event,
      groupBy,
      ...(link && { linkId: link.id }),
      workspaceId: workspace.id,
      isDeprecatedClicksEndpoint,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
