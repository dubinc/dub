import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/analytics – get timeseries analytics for a partner
export const GET = withReferralsEmbedToken(async ({ programId, partnerId }) => {
  const analytics = await getAnalytics({
    event: "composite",
    groupBy: "timeseries",
    interval: "1y",
    programId,
    partnerId,
  });

  return NextResponse.json(analytics);
});
