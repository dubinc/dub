import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withAdmin } from "@/lib/auth";
import { parseAnalyticsQuery } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/admin/analytics – get analytics for admin
export const GET = withAdmin(async ({ searchParams }) => {
  const parsedParams = parseAnalyticsQuery(searchParams);

  const response = await getAnalytics(parsedParams);

  return NextResponse.json(response);
});
