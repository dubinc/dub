import { getEvents } from "@/lib/analytics/get-events";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getLink } from "@/lib/api/links/get-link";
import { withWorkspace } from "@/lib/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const parsedParams = eventsQuerySchema.parse(searchParams);

    let { event, interval, start, end, linkId, externalId, domain, key } =
      parsedParams;

    const link = await getLink({
      workspace: workspace,
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

    const response = await getEvents({
      ...parsedParams,
      event,
      ...(link && { linkId: link.id }),
      workspaceId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
    betaFeature: true,
  },
);
