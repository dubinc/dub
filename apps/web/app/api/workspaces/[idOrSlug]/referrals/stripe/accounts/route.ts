import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/referrals/stripe/accounts - create a connect & financial account for the workspace
export const POST = withWorkspace(async ({ workspace, session }) => {
  let stripeConnectId = workspace?.stripeConnectId;
  let stripeFinancialId = workspace?.stripeFinancialId;

  if (stripeConnectId && stripeFinancialId) {
    return NextResponse.json(workspace);
  }

  // Create Connect Account if it doesn't exist
  if (!stripeConnectId) {
    const account = await stripe.accounts.create({
      country: "US",
      email: session.user.email,
      // business_type: "company",
      business_type: "individual",
      controller: {
        stripe_dashboard: { type: "none" },
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "application",
      },
      capabilities: {
        transfers: { requested: true },
        treasury: { requested: true },
        us_bank_account_ach_payments: { requested: true },
      },
    });

    stripeConnectId = account.id;

    console.info(
      `[Stripe Treasury] Connected account ${stripeConnectId} created for the workspace ${workspace.id}`,
    );
  }

  // Create a Financial Account if it doesn't exist
  if (!stripeFinancialId) {
    const account = await stripe.treasury.financialAccounts.create(
      {
        supported_currencies: ["usd"],
        features: {
          inbound_transfers: { ach: { requested: true } },
          outbound_payments: {
            ach: { requested: true },
            us_domestic_wire: { requested: true },
          },
          financial_addresses: { aba: { requested: true } },
          intra_stripe_flows: { requested: true },
        },
      },
      { stripeAccount: stripeConnectId },
    );

    stripeFinancialId = account.id;

    console.info(
      `[Stripe Treasury] Financial account ${stripeFinancialId} created for the workspace ${workspace.id}`,
    );
  }

  const workspaceUpdated = await prisma.project.update({
    where: { id: workspace.id },
    data: {
      stripeConnectId,
      stripeFinancialId,
    },
  });

  return NextResponse.json(workspaceUpdated);
});

// GET /api/workspaces/[idOrSlug]/referrals/stripe/accounts - get the financial account for the workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const stripeConnectId = workspace.stripeConnectId;
  const stripeFinancialId = workspace.stripeFinancialId;

  if (!stripeConnectId || !stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  const financialAccount = await stripe.treasury.financialAccounts.retrieve(
    stripeFinancialId,
    { stripeAccount: stripeConnectId },
  );

  return NextResponse.json(financialAccount);
});
