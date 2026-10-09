import { getEarningsProgramId } from "@/lib/api/partner-profile/get-earnings-program-id";
import { getPartnerEarningsByGroup } from "@/lib/api/partner-profile/get-partner-earnings-by-group";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileEarningsAnalyticsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/earnings/analytics - highest-earning programs, links, or commission types for a partner
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { groupBy, programIdOrSlug, ...filters } =
    partnerProfileEarningsAnalyticsQuerySchema.parse(searchParams);

  const programId = await getEarningsProgramId({
    partnerId: partner.id,
    programIdOrSlug,
  });

  const earnings = await getPartnerEarningsByGroup({
    partnerId: partner.id,
    programId,
    filters: {
      ...filters,
      groupBy,
    },
  });

  return NextResponse.json(earnings);
});
