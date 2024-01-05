import { withAuth } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project }) => {
    const { endpoint } = params;
    const { domain, key, interval } = searchParams;

    const constructedDomain =
      domain || project?.domains?.map((d) => d.slug).join(",");

    if (!constructedDomain) {
      return new Response("Missing link domain.", { status: 400 });
    }

    // if there's no key and it's not a project, return 400
    // this is because projects can show stats for all links
    if (!key && !project) {
      return new Response("Missing link key.", { status: 400 });
    }

    // return 403 if project is on the free plan and interval is 90d or all
    if (
      project?.plan === "free" &&
      (interval === "all" || interval === "90d")
    ) {
      return new Response(`Require higher plan`, { status: 403 });
    }

    const response = await getStats({
      domain: constructedDomain,
      key,
      endpoint,
      interval,
      ...searchParams,
    });
    return NextResponse.json(response);
  },
  {
    needNotExceededUsage: true,
  },
);
