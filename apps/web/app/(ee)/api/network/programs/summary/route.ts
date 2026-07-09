import { withPartnerProfile } from "@/lib/auth/partner";
import { getMarketplaceProgramsSummary } from "@/lib/fetchers/get-marketplace-programs-summary";
import { NextResponse } from "next/server";

// GET /api/network/programs/summary - marketplace home sections in one call
export const GET = withPartnerProfile(async () => {
  const summary = await getMarketplaceProgramsSummary();

  return NextResponse.json(summary);
});
