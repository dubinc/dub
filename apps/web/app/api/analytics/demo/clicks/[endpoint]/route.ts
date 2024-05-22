import { getClicks } from "@/lib/analytics/get-clicks";
import { withAdmin } from "@/lib/auth";
import {
  analyticsEndpointSchema,
  clickAnalyticsQuerySchema,
} from "@/lib/zod/schemas/clicks-analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/demo/clicks/[endpoint] – get click analytics for admin
export const GET = withAdmin(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = clickAnalyticsQuerySchema.parse(searchParams);

  const response = await getClicks({
    ...parsedParams,
    endpoint,
    isDemo: true,
  });

  return NextResponse.json(response);
});
