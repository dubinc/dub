import { getAnalytics } from "@/lib/analytics";
import { withAdmin } from "@/lib/auth";
import {
  analyticsEndpointSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/admin/analytics/[endpoint] – get analytics for a specific endpoint
export const GET = withAdmin(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = getAnalyticsQuerySchema.parse(searchParams);

  const response = await getAnalytics({
    endpoint,
    ...parsedParams,
  });
  return NextResponse.json(response);
});
