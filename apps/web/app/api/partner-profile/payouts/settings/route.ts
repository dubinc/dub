import { withPartnerProfile } from "@/lib/auth/partner";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// GET /api/partner-profile/payouts/settings
export const GET = withPartnerProfile(async ({ partner }) => {
  if (!partner.stripeConnectId) {
    return NextResponse.json(null);
  }

  const externalAccounts = await stripe.accounts.listExternalAccounts(
    partner.stripeConnectId,
    {
      object: "bank_account",
    },
  );

  return NextResponse.json(externalAccounts.data[0]);
});
