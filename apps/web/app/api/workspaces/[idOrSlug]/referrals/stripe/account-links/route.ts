import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
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
    type: "account_onboarding",
    refresh_url: `${APP_DOMAIN_WITH_NGROK}/${workspace.slug}/settings/referrals?refresh=true`,
    return_url: `${APP_DOMAIN_WITH_NGROK}/${workspace.slug}/settings/referrals?return=true`,
  });

  console.info(
    `[Stripe Treasury] Account link created for the workspace ${workspace.id}`,
  );

  return NextResponse.json(accountLink);
});
