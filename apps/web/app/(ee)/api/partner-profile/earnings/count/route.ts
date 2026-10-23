import { getEarningsProgramId } from "@/lib/api/partner-profile/get-earnings-program-id";
import { getPartnerEarningsCount } from "@/lib/api/partner-profile/get-partner-earnings-count";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileEarningsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/earnings/count - get earnings count for a partner across all programs (or a single program)
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programIdOrSlug, ...filters } =
    partnerProfileEarningsCountQuerySchema.parse(searchParams);

  const programId = await getEarningsProgramId({
    partnerId: partner.id,
    programIdOrSlug,
  });

  const counts = await getPartnerEarningsCount({
    partnerId: partner.id,
    programId,
    filters,
  });

  return NextResponse.json(counts);
});
