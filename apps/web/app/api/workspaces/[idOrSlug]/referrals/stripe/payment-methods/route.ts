import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

//pm_1PVz0n2XQj81dFvpB4gBokna

// POST /api/workspaces/[idOrSlug]/referrals/stripe/accounts - create a connect & financial account for the workspace
export const GET = withWorkspace(async ({ workspace, session }) => {
  if (!workspace.stripeConnectId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect account not found for workspace ${workspace.id}`,
    });
  }

  const setupIntent = await stripe.setupIntents.create(
    {
      attach_to_self: true,
      payment_method_data: {
        type: "us_bank_account",
        us_bank_account: {
          account_holder_type: "individual",
          account_number: "000123456789",
          account_type: "checking",
          routing_number: "110000000",
        },
        billing_details: {
          address: {
            city: "San Francisco",
            country: "US",
            line1: "123 Main St",
            line2: "Apt 4",
            postal_code: "94111",
            state: "CA",
          },
          email: session.user.email,
          name: session.user.name,
          phone: "1234567890",
        },
      },
      confirm: true,
      payment_method_types: ["us_bank_account"],
      flow_directions: ["inbound"],
      mandate_data: {
        customer_acceptance: {
          type: "online",
          accepted_at: Math.floor(Date.now() / 1000),
          online: {
            ip_address: "127.0.0.1",
            user_agent: "Mozilla/5.0",
          },
        },
      },
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  console.log(setupIntent);

  // const confirmsetupIntent = await stripe.setupIntents.confirm(
  //   setupIntent.id,
  //   {
  //     payment_method: setupIntent.payment_method,
  //     // confirm: true,
  //     mandate_data: {
  //       customer_acceptance: {
  //         type: "online",
  //         accepted_at: Math.floor(Date.now() / 1000),
  //         online: {
  //           ip_address: "127.0.0.1",
  //           user_agent: "Mozilla/5.0",
  //         },
  //       },
  //     },
  //   },
  //   {
  //     stripeAccount: workspace.stripeConnectId,
  //   },
  // );

  // console.log(confirmsetupIntent);

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

  return NextResponse.json(setupIntent);
});
