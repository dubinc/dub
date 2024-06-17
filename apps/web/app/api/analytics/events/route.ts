import { getEvents } from "@/lib/analytics/get-events";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { throwIfNoAccess } from "@/lib/api/tokens/permissions";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ searchParams, workspace, link, scopes }) => {
    throwIfNoAccess({
      scopes,
      requiredAnyOf: ["analytics.read"],
    });

    const parsedParams = eventsQuerySchema.parse(searchParams);

    let { event, domain, key, interval, start, end } = parsedParams;

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
