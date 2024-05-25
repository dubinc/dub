import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withSession } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/demo
export const GET = withSession(async ({ searchParams }) => {
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getAnalytics({
    ...parsedParams,
    isDemo: true,
  });

  return NextResponse.json(response);
});
