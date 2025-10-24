import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/analytics – get timeseries analytics for a partner
export const GET = withReferralsEmbedToken(async ({ links, program }) => {
  if (links.length === 0) {
    return NextResponse.json([]);
  }

  const analytics = await getAnalytics({
    event: "composite",
    groupBy: "timeseries",
    interval: "1y",
    linkIds: links.map((link) => link.id),
    dataAvailableFrom: program.startedAt ?? program.createdAt,
  });

  return NextResponse.json(analytics);
});
