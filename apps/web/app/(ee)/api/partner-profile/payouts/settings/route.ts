import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { NextResponse } from "next/server";

// GET /api/partner-profile/payouts/settings
export const GET = withPartnerProfile(async ({ partner }) => {
  if (!partner.stripeConnectId) {
    return NextResponse.json({});
  }

  const bankAccount = await getPartnerBankAccount(partner.stripeConnectId);

  return NextResponse.json(bankAccount);
});
