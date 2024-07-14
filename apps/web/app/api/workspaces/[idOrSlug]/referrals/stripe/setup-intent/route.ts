import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// Add a US bank account payment method
export const POST = withWorkspace(async ({ workspace, session }) => {
  if (!workspace.stripeConnectId || !workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  const setupIntent = await stripe.setupIntents.create(
    {
      attach_to_self: true,
      flow_directions: ["inbound", "outbound"],
      payment_method_types: ["us_bank_account"],
      payment_method_options: {
        us_bank_account: { verification_method: "automatic" },
      },
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  console.info(
    `[Stripe Treasury] A new setup intent ${setupIntent.id} has been created for workspace ${workspace.id}`,
  );

  return NextResponse.json(setupIntent);
});

// const inboundTransfer = await stripe.treasury.inboundTransfers.create(
//   {
//     origin_payment_method: "pm_1PVz0n2XQj81dFvpB4gBokna",
//     financial_account: workspace.stripeFinancialId!,
//     amount: 20000,
//     currency: "usd",
//     description: "Funds for repair",
//   },
//   {
//     stripeAccount: workspace.stripeConnectId,
//   },
// );

// console.log(inboundTransfer);
