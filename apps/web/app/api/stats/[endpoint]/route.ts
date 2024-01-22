import { withAuth } from "@/lib/auth";
import { getDomainViaEdge, getLinkViaEdge } from "@/lib/planetscale";
import { getStats } from "@/lib/stats";
import { DUB_PROJECT_ID, isDubDomain } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project, link }) => {
    const { endpoint } = params;
    let { domain, key, interval } = searchParams;

    // return 403 if project is on the free plan and interval is 90d or all
    if (
      project?.plan === "free" &&
      (interval === "all" || interval === "90d")
    ) {
      return new Response(`Require higher plan`, { status: 403 });
    }

    const linkId = link
      ? link.id
      : domain && key === "_root"
      ? await getDomainViaEdge(domain).then((d) => d?.id)
      : null;

    const response = await getStats({
      projectId: project.id,
      domain,
      endpoint,
      interval,
      ...(linkId && { linkId }),
      ...searchParams,
    });
    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
