import { withAuth } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project }) => {
    const { endpoint } = params;
    const { domain, key, interval } = searchParams;

    const response = await getStats({
      domain:
        domain || project?.domains?.map((d) => d.slug).join(",") || "dub.sh",
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
