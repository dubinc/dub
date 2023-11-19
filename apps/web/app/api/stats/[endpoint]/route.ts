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

    if (!project && !key) {
      return new Response("Missing link key.", { status: 400 });
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
