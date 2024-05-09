import { getClicks } from "@/lib/analytics";
import { withAdmin } from "@/lib/auth";
import { clickAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/admin/analytics/clicks – get click analytics for admin
export const GET = withAdmin(async ({ searchParams }) => {
  const parsedParams = clickAnalyticsQuerySchema.parse(searchParams);

  const response = await getClicks(parsedParams);

  return NextResponse.json(response);
});
