import { getClicks, validDateRangeForPlan } from "@/lib/analytics";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { clickAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/analytics/clicks – get click analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace, link }) => {
    const parsedProps = clickAnalyticsQuerySchema.parse(searchParams);

    let { domain, key, interval, start, end } = parsedProps;

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
      ...parsedProps,
      ...(linkId && { linkId }),
      workspaceId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
