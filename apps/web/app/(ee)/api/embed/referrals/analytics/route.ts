import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/analytics – get timeseries analytics for a partner
export const GET = withReferralsEmbedToken(async ({ programEnrollment }) => {
  const analytics = await getAnalytics({
    event: "composite",
    groupBy: "timeseries",
    interval: "1y",
    programId: programEnrollment.programId,
    partnerId: programEnrollment.partnerId,
  });

  return NextResponse.json(analytics);
});
