import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withAdmin } from "@/lib/auth";
import {
  analyticsEndpointSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/admin/clicks/[endpoint] – get click analytics for admin
export const GET = withAdmin(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getAnalytics("clicks", {
    ...parsedParams,
    endpoint,
  });

  return NextResponse.json(response);
});
