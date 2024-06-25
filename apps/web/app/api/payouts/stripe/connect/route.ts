import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// TODO:
// Restrict only for US users

// POST /api/payouts/stripe/connect - create a connected account & Treasury financial account for the workspace
export const POST = withWorkspace(async ({ workspace, session }) => {
  if (workspace.stripeConnectedAccountId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Connect] Connected account already exists for the workspace ${workspace.id}`,
    });
  }

  const isDemoMode = true;

  const onboardingData: Stripe.AccountUpdateParams = {
    // TODO: Only update the fields during the demo that are outstanding to speed things up
    // FOR-DEMO-ONLY: We're using fake data for illustrative purposes in this demo. The fake data will be used to bypass
    // showing the Stripe Connect Onboarding forms. In a real application, you would not do this so that you can collect
    // the real KYC data from your users.
    ...(isDemoMode && {
      business_type: "individual",
      business_profile: {
        name: "Acme",
        // Merchant category code for "computer software stores" (https://fs.fldfs.com/iwpapps/pcard/docs/MCCs.pdf)
        mcc: "5734",
        product_description: "Some demo product",
        url: "https://some-company.com",
        annual_revenue: {
          amount: 0,
          currency: "usd",
          fiscal_year_end: "2023-12-31",
        },
        estimated_worker_count: 1,
      },
      company: {
        name: "Acme",
        // Fake business TIN: https://stripe.com/docs/connect/testing#test-business-tax-ids
        tax_id: "000000000",
      },
      individual: {
        address: {
          // This value causes the address to be verified in testmode: https://stripe.com/docs/connect/testing#test-verification-addresses
          line1: "address_full_match",
          ...{
            city: "South San Francisco",
            state: "CA",
            postal_code: "94080",
          },
          country: "US",
        },
        // These values together cause the DOB to be verified in testmode: https://stripe.com/docs/connect/testing#test-dobs
        dob: {
          day: 1,
          month: 1,
          year: 1901,
        },
        email: session.user.email,
        first_name: "John",
        last_name: "Smith",
        // Fake phone number: https://stripe.com/docs/connect/testing
        // TODO: Normally 000-000-0000 is a valid testmode phone number, but it's currently broken. Once Stripe fixes
        // it, we can change back to 000-000-0000. For now, this is a fake number that will pass validation.
        phone: "2015550123",
      },
      ...{ tos_acceptance: { date: 1691518261, ip: "127.0.0.1" } },
      // Faking Terms of Service acceptances
      settings: {
        card_issuing: {
          tos_acceptance: { date: 1691518261, ip: "127.0.0.1" },
        },
        treasury: {
          tos_acceptance: { date: 1691518261, ip: "127.0.0.1" },
        },
      },
    }),
  };

  const account = await stripe.accounts.create({
    country: "US",
    email: session.user.email,
    controller: {
      stripe_dashboard: {
        type: "none",
      },
      fees: {
        payer: "application",
      },
      requirement_collection: "application",
      losses: {
        payments: "application",
      },
    },
    ...onboardingData,

    // ...(isDemoMode && {
    //   // FOR-DEMO-ONLY: We're hardcoding the business type to individual. You should either remove this line or modify it
    //   // to collect the real business type from the user.
    //   business_type: "individual",
    //   // FOR-DEMO-ONLY: We're hardcoding the SSN to 000-00-0000 (Test SSN docs: https://stripe.com/docs/connect/testing#test-personal-id-numbers).
    //   // You should either remove this line or modify it to collect the actual SSN from the user in a real application.
    //   individual: {
    //     id_number: "000000000",
    //   },
    // }),
    capabilities: {
      transfers: { requested: true },
      // `card_payments` is only requested for the Test Data section to demonstrate payments and how it is a separate
      // balance from the Issuing balance or Treasury Financial Account balance. It is not required for Issuing or
      // Treasury.
      card_payments: { requested: true },
      card_issuing: { requested: true },
      // If we are creating an user an embedded finance platform, we must request
      // the `treasury` capability in order to create a FinancialAccount for them
      treasury: {
        requested: true,
      },
    },
  });

  console.log("account created", account);

  await prisma.project.update({
    where: { id: workspace.id },
    data: {
      stripeConnectedAccountId: account.id,
      stripeFinancialAccountId: "",
    },
  });

  // If this is an Embedded Finance user, create a Treasury Financial Account,
  // in which the user will store their funds
  const res = await stripe.treasury.financialAccounts.create(
    {
      supported_currencies: ["usd"],
      features: {
        card_issuing: { requested: true },
        deposit_insurance: { requested: true },
        financial_addresses: { aba: { requested: true } },
        inbound_transfers: { ach: { requested: true } },
        intra_stripe_flows: { requested: true },
        outbound_payments: {
          ach: { requested: true },
          us_domestic_wire: { requested: true },
        },
        outbound_transfers: {
          ach: { requested: true },
          us_domestic_wire: { requested: true },
        },
      },
    },
    { stripeAccount: account.id },
  );

  // console.log("Stripe financial account created", res);

  return NextResponse.json(res);
});
