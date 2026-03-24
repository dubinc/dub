import { getPartnerEarningsTimeseries } from "@/lib/api/partner-profile/get-partner-earnings-timeseries";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/earnings/timeseries - get earnings timeseries for a partner from an embed token
export const GET = withReferralsEmbedToken(
  async ({ programEnrollment, searchParams }) => {
    const filters = getPartnerEarningsTimeseriesSchema.parse(searchParams);

    const timeseries = await getPartnerEarningsTimeseries({
      partnerId: programEnrollment.partnerId,
      programId: programEnrollment.programId,
      filters,
    });

    return NextResponse.json(timeseries);
  },
);
