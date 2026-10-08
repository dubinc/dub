import { getEarningsProgramId } from "@/lib/api/partner-profile/get-earnings-program-id";
import { getPartnerTopEarnings } from "@/lib/api/partner-profile/get-partner-top-earnings";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileTopEarningsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/earnings/top - get the programs or links with the highest earnings for a partner in a date range
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programIdOrSlug, ...filters } =
    partnerProfileTopEarningsQuerySchema.parse(searchParams);

  const programId = await getEarningsProgramId({
    partnerId: partner.id,
    programIdOrSlug,
  });

  const topEarnings = await getPartnerTopEarnings({
    partnerId: partner.id,
    programId,
    filters,
  });

  return NextResponse.json(topEarnings);
});
