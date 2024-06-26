import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/[idOrSlug]/referrals/stripe/account-links  - create a link for the user to onboard to a connected account
export const POST = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeConnectId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect account not found for workspace ${workspace.id}`,
    });
  }

  if (!workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Financial account not found for workspace ${workspace.id}`,
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: workspace.stripeConnectId,
    refresh_url: "https://example.com/reauth",
    return_url: "https://example.com/return",
    type: "account_onboarding",
  });

  console.log(accountLink);

  console.info(
    `[Stripe Treasury] Account link created for the workspace ${workspace.id}`,
  );

  return NextResponse.json(accountLink);
});
