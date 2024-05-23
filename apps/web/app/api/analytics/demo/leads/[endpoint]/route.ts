import { getLeads } from "@/lib/analytics/get-leads";
import { withSession } from "@/lib/auth";
import {
  analyticsEndpointSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/demo/leads/[endpoint] – get click analytics for admin
export const GET = withSession(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getLeads({
    ...parsedParams,
    endpoint,
    isDemo: true,
  });

  return NextResponse.json(response);
});
