import { withPartner } from "@/lib/auth/partner";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/payouts/settings
export const GET = withPartner(async ({ partner }) => {
  if (!partner.stripeConnectId) {
    return NextResponse.json({});
  }

  const externalAccounts = await stripe.accounts.listExternalAccounts(
    partner.stripeConnectId,
    {
      object: "bank_account",
    },
  );

  return NextResponse.json(externalAccounts.data[0]);
});
