import { withPartnerProfile } from "@/lib/auth/partner";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { z } from "zod";

const response = z
  .object({
    bank_name: z.string(),
    routing_number: z.string(),
    last4: z.string(),
  })
  .nullable();

// GET /api/partner-profile/payouts/settings
export const GET = withPartnerProfile(async ({ partner }) => {
  if (!partner.stripeConnectId) {
    return NextResponse.json({});
  }

  const externalAccounts = await stripe.accounts.listExternalAccounts(
    partner.stripeConnectId,
    {
      object: "bank_account",
    },
  );

  const bankAccounts =
    externalAccounts.data.length > 0
      ? response.parse(externalAccounts.data[0])
      : {};

  return NextResponse.json(bankAccounts);
});
