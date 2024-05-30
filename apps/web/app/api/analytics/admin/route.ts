import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withAdmin } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/admin – get analytics for admin
export const GET = withAdmin(async ({ searchParams }) => {
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getAnalytics(parsedParams);

  return NextResponse.json(response);
});
