import { getClicks } from "@/lib/analytics/clicks";
import { withAdmin } from "@/lib/auth";
import {
  analyticsEndpointSchema,
  clickAnalyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/admin/analytics/clicks – get click analytics for admin
export const GET = withAdmin(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = clickAnalyticsQuerySchema.parse(searchParams);

  const response = await getClicks({
    ...parsedParams,
    endpoint,
  });

  return NextResponse.json(response);
});
