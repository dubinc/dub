import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerPayoutMethods } from "@/lib/payouts/api/get-partner-payout-methods";
import { NextResponse } from "next/server";

// GET /api/partner-profile/payouts/settings
export const GET = withPartnerProfile(async ({ partner }) => {
  const payoutMethods = await getPartnerPayoutMethods(partner);

  return NextResponse.json(payoutMethods);
});
