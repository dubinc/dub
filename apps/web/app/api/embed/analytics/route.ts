import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withEmbedToken } from "@/lib/embed/auth";
import { NextResponse } from "next/server";

// GET /api/embed/analytics – get timeseries analytics for a link from an embed token
export const GET = withEmbedToken(async ({ link }) => {
  const analytics = await getAnalytics({
    event: "composite",
    groupBy: "timeseries",
    linkId: link.id,
    interval: "1y",
  });

  return NextResponse.json(analytics);
});
