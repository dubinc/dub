import { getLeads } from "@/lib/analytics/get-leads";
import { withAdmin } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { analyticsEndpointSchema } from "@/lib/zod/schemas/clicks-analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/demo/leads/[endpoint] – get click analytics for admin
export const GET = withAdmin(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getLeads({
    ...parsedParams,
    endpoint,
    isDemo: true,
  });

  return NextResponse.json(response);
});
