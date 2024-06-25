import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/payouts/stripe/onboarding - create a link for the user to onboard to a connected account
export const POST = withWorkspace(async ({ workspace, session }) => {
  // TODO:
  // Check account already exists
  // Restrict only for US users

  const { stripeConnectedAccountId } = workspace;

  if (!stripeConnectedAccountId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Connect] No connected account found for the workspace ${workspace.id}`,
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeConnectedAccountId,
    refresh_url: "https://example.com/reauth",
    return_url: "https://example.com/return",
    type: "account_onboarding",
  });

  console.log("Stripe account link created", accountLink);

  return NextResponse.json(accountLink);
});
