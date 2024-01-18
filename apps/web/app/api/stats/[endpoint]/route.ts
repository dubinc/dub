import { withAuth } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { DUB_PROJECT_ID, isDubDomain } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project }) => {
    const { endpoint } = params;
    const { domain, key, interval } = searchParams;

    let filteredDomain = "";

    // TODO: remove this logic after #545 merges
    if (
      domain &&
      (!isDubDomain(domain) || key || project.id === DUB_PROJECT_ID)
    ) {
      filteredDomain = domain;
    } else if (project.domains.length > 0) {
      filteredDomain = project.domains.map((d) => d.slug).join(",");
    }

    // return 403 if project is on the free plan and interval is 90d or all
    if (
      project?.plan === "free" &&
      (interval === "all" || interval === "90d")
    ) {
      return new Response(`Require higher plan`, { status: 403 });
    }

    const response = await getStats({
      domain: filteredDomain,
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
