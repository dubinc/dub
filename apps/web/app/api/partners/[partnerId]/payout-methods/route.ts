import { withPartner } from "@/lib/auth/partner";
import { retrievePayoutMethods } from "@/lib/dots/retrieve-payout-methods";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/payout-methods – get payout methods for a partner
export const GET = withPartner(async ({ partner }) => {
  if (!partner.dotsUserId) {
    return NextResponse.json([]);
  }

  const payoutMethods = await retrievePayoutMethods(partner.dotsUserId);

  return NextResponse.json(payoutMethods);
});
