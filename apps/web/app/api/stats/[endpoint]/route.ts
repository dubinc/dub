import { withAuth } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project }) => {
    const { endpoint } = params;
    let { domain, key, interval } = searchParams;

    // TODO: remove this logic after #545 merges
    if (!domain && project.domains.length > 0) {
      domain = project.domains.map((d) => d.slug).join(",");
    }

    // return 403 if project is on the free plan and interval is 90d or all
    if (
      project?.plan === "free" &&
      (interval === "all" || interval === "90d")
    ) {
      return new Response(`Require higher plan`, { status: 403 });
    }

    const response = await getStats({
      projectId: project.id,
      domain,
      key,
      endpoint,
      interval,
      ...searchParams,
    });
    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
