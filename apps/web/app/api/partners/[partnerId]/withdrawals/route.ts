import { withPartner } from "@/lib/auth/partner";
import { retrieveTransfers } from "@/lib/dots/retrieve-transfers";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/withdrawals – get withdrawals for a partner
export const GET = withPartner(async ({ partner }) => {
  const { dotsUserId } = partner;

  if (!dotsUserId) {
    return NextResponse.json({ data: [], has_more: false });
  }

  return NextResponse.json(
    await retrieveTransfers({ dotsUserId, type: "payout" }),
  );
});
