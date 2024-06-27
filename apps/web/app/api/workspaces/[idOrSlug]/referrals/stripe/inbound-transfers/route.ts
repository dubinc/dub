import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// Create an InboundTransfer
export const POST = withWorkspace(async ({ workspace, session }) => {
  if (!workspace.stripeConnectId || !workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  // TODO:
  // Accept the `origin_payment_method`, `amount`, `description` from the request body

  const inboundTransfer = await stripe.treasury.inboundTransfers.create(
    {
      origin_payment_method: "pm_1PWEGm2XQj81dFvp5BOQ11e0",
      financial_account: workspace.stripeFinancialId,
      amount: 4390,
      currency: "usd",
      description: "Funds for repair",
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  console.info(
    `[Stripe Treasury] Inbound transfer ${inboundTransfer.id} has been created for workspace ${workspace.id}`,
  );

  return NextResponse.json(inboundTransfer);
});

// Returns a list of InboundTransfers sent from the specified FinancialAccount.
export const GET = withWorkspace(async ({ workspace, session }) => {
  if (!workspace.stripeConnectId || !workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  const inboundTransfers = await stripe.treasury.inboundTransfers.list(
    {
      financial_account: workspace.stripeFinancialId,
      limit: 10,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  return NextResponse.json(inboundTransfers.data);
});
