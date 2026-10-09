import { getEarningsProgramId } from "@/lib/api/partner-profile/get-earnings-program-id";
import { getPartnerEarningsTimeseries } from "@/lib/api/partner-profile/get-partner-earnings-timeseries";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileEarningsTimeseriesQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/earnings/timeseries - get earnings timeseries for a partner across all programs (or a single program)
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programIdOrSlug, ...filters } =
    partnerProfileEarningsTimeseriesQuerySchema.parse(searchParams);

  const programId = await getEarningsProgramId({
    partnerId: partner.id,
    programIdOrSlug,
  });

  const timeseries = await getPartnerEarningsTimeseries({
    partnerId: partner.id,
    programId,
    filters,
  });

  return NextResponse.json(timeseries);
});
