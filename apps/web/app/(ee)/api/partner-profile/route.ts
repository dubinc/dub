import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerFeatureFlags } from "@/lib/edge-config";
import { NextResponse } from "next/server";

// GET /api/partner-profile - get a partner profile
export const GET = withPartnerProfile(async ({ partner, partnerUser }) => {
  const featureFlags = await getPartnerFeatureFlags(partner.id);

  return NextResponse.json({
    ...partnerUser,
    ...partner,
    featureFlags,
  });
});
