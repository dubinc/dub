import { withAuth } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams }) => {
    const { endpoint } = params;
    const { domain, key, interval } = searchParams;

    const response = await getStats({
      domain,
      key,
      endpoint,
      interval,
    });
    return NextResponse.json(response);
  },
  {
    needNotExceededUsage: true,
  },
);
