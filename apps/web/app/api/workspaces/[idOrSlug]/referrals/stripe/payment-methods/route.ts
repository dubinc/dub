import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/referrals/stripe/payment-methods - get payment methods for the workspace
export const GET = withWorkspace(async ({ workspace, session }) => {
  if (!workspace.stripeConnectId || !workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  const paymentMethods = await stripe.paymentMethods.list(
    { limit: 5 },
    { stripeAccount: workspace.stripeConnectId },
  );

  return NextResponse.json(paymentMethods.data);
});
