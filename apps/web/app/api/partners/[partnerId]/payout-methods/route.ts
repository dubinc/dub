import { withPartner } from "@/lib/auth/partner";
import { retrieveDotsPayoutMethods } from "@/lib/dots/retrieve-dots-payout-methods";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/payout-methods – get Dots payout methods for a partner
// TODO: [dots] probably need to update this to work from both the partners.dub.co and app.dub.co sides
export const GET = withPartner(async ({ partner }) => {
  const { dotsUserId, dotsAppId } = partner;

  if (!dotsUserId || !dotsAppId) {
    return NextResponse.json(null);
  }

  return NextResponse.json(
    await retrieveDotsPayoutMethods({ dotsUserId, dotsAppId }),
  );
});
