import { getEarningsForPartner } from "@/lib/api/partner-profile/get-earnings-for-partner";
import { getEarningsProgramId } from "@/lib/api/partner-profile/get-earnings-program-id";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileEarningsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/earnings - get earnings for a partner across all programs (or a single program)
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programIdOrSlug, ...filters } =
    partnerProfileEarningsQuerySchema.parse(searchParams);

  const programId = await getEarningsProgramId({
    partnerId: partner.id,
    programIdOrSlug,
  });

  const earnings = await getEarningsForPartner({
    ...filters,
    programId,
    partnerId: partner.id,
  });

  return NextResponse.json(earnings);
});
