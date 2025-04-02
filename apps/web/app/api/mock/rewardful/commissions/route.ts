import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const commissions = Array.from({ length: 10 }, (_, i) => ({
    id: `39e68c88-d84a-4510-b3b4-43c75016a0${i}0`,
    created_at: `2020-08-${19 + i}T16:28:31.164Z`,
    updated_at: `2020-08-${19 + i}T16:28:31.164Z`,
    amount: 3000 + i * 1000,
    currency: "USD",
    state: ["pending", "due", "paid", "voided"][i % 4],
    due_at: `2020-09-${18 + i}T16:28:25.000Z`,
    paid_at: i % 3 === 1 ? `2020-09-${20 + i}T16:28:25.000Z` : null,
    voided_at: i % 3 === 2 ? `2020-09-${21 + i}T16:28:25.000Z` : null,
    campaign: {
      id: "ceaef6d9-767e-49aa-a6ab-46c02aa79604",
      created_at: `2020-05-22T02:55:19.802Z`,
      updated_at: `2020-08-19T16:28:16.177Z`,
      name: `Campaign ${i + 1}`,
    },
    sale: {
      id: `74e37d3b-03c5-4bfc-841c-a79d5799551${i}`,
      currency: "USD",
      charged_at: `2020-08-${19 + i}T16:28:25.000Z`,
      stripe_account_id: `acct_ABC${123 + i}`,
      stripe_charge_id: `ch_ABC${123 + i}`,
      invoiced_at: `2020-08-${19 + i}T16:28:25.000Z`,
      created_at: `2020-08-${19 + i}T16:28:31.102Z`,
      updated_at: `2020-08-${19 + i}T16:28:31.102Z`,
      charge_amount_cents: 10000 + i * 1000,
      refund_amount_cents: 0,
      tax_amount_cents: 0,
      sale_amount_cents: 10000 + i * 1000,
      referral: {
        id: `d154e622-278a-4103-b191-5cbebae4047${i}`,
        stripe_account_id: `acct_ABC${123 + i}`,
        stripe_customer_id: `cus_ABC${123 + i}`,
        conversion_state: "conversion",
        deactivated_at: null,
        expires_at: `2020-10-18T16:13:12.109Z`,
        created_at: `2020-08-19T16:13:12.109Z`,
        updated_at: `2020-08-19T16:28:31.166Z`,
        customer: {
          platform: "stripe",
          id: `cus_ABC${123 + i}`,
          name: [
            "Freddie Mercury",
            "David Bowie",
            "Mick Jagger",
            "Robert Plant",
            "Roger Waters",
            "Paul McCartney",
            "John Lennon",
            "George Harrison",
            "Ringo Starr",
            "Brian May",
          ][i],
          email: `rockstar${i}@example.com`,
        },
        visits: 2 + i,
        link: {
          id: `b759a9ed-ed63-499f-b621-0221f2712${i}86`,
          url: `http://www.demo.com:8080/?via=ref${i}`,
          token: `ref${i}`,
          visitors: 197 + i,
          leads: 196 + i,
          conversions: 156 + i,
        },
      },
      affiliate: {
        id: `07d8acc5-c689-4b4a-bbab-f88a71ffc0${i}2`,
        created_at: `2020-05-22T02:55:19.934Z`,
        updated_at: `2020-08-19T16:28:31.168Z`,
        first_name: [
          "James",
          "Felix",
          "Eve",
          "M",
          "Q",
          "Bill",
          "Alec",
          "Pierce",
          "Timothy",
          "Daniel",
        ][i],
        last_name: [
          "Bond",
          "Leiter",
          "Moneypenny",
          "Mansfield",
          "Boothroyd",
          "Tanner",
          "Trevelyan",
          "Brosnan",
          "Dalton",
          "Craig",
        ][i],
        email: `agent${i}@mi6.co.uk`,
        paypal_email: "",
        confirmed_at: `2020-07-09T03:53:06.760Z`,
        paypal_email_confirmed_at: `2020-07-03T17:49:23.489Z`,
        receive_new_commission_notifications: true,
        sign_in_count: 1 + i,
        unconfirmed_email: null,
        stripe_customer_id: null,
        stripe_account_id: null,
        visitors: 197 + i,
        leads: 196 + i,
        conversions: 156 + i,
        campaign: {
          id: `c3482343-8680-40c5-af9a-9efa119713b${i}`,
          created_at: `2020-05-22T02:55:19.802Z`,
          updated_at: `2020-08-19T16:28:16.177Z`,
          name: `Campaign ${i + 1}`,
        },
      },
    },
  }));

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const slicedCommissions = commissions.slice(startIndex, endIndex);

  return NextResponse.json({
    data: slicedCommissions.length > 0 ? slicedCommissions : [],
  });
}
