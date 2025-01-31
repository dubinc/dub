import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withEmbedToken } from "@/lib/embed/auth";
import { NextResponse } from "next/server";

// GET /api/embed/analytics – get timeseries analytics for a link from an embed token
export const GET = withEmbedToken(async ({ programId, partnerId }) => {
  const analytics = await getAnalytics({
    event: "composite",
    groupBy: "timeseries",
    interval: "1y",
    programId,
    partnerId,
  });

  return NextResponse.json(analytics);
});
