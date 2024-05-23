import { getSales } from "@/lib/analytics/get-sales";
import { withAdmin } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { analyticsEndpointSchema } from "@/lib/zod/schemas/clicks-analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/demo/sales/[endpoint] – get click analytics for admin
export const GET = withAdmin(async ({ params, searchParams }) => {
  const { endpoint } = analyticsEndpointSchema.parse(params);
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getSales({
    ...parsedParams,
    endpoint,
    isDemo: true,
  });

  return NextResponse.json(response);
});
