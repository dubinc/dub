import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withAuth } from "@/lib/referrals/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/client - get analytics for the current link
export const GET = withAuth(async ({ workspace, link, searchParams }) => {
  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getAnalytics({
    ...parsedParams,
    workspaceId: workspace.id,
    linkId: link.id,
  });

  return NextResponse.json(response);
});
