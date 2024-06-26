import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// TODO:
// Restrict only for US users

// POST /api/[idOrSlug]/referrals/stripe/accounts - create a connected account & Treasury financial account for the workspace
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
      business_type: "company",
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
          // Adding funds to a FinancialAccount from another Account with the same owner.
          inbound_transfers: { ach: { requested: true } },

          // Initiating money movement out of the FinancialAccount to someone else's bucket of money.
          outbound_payments: {
            ach: { requested: true },
            us_domestic_wire: { requested: true },
          },
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
