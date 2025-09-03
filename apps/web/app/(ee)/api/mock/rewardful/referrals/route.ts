import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const referrals = Array.from({ length: 10 }, (_, i) => ({
    id: `e523da29-6157-4aac-b4b5-05b3b7b14fb${i}`,
    link: {
      id: `32a19d65-2b68-434d-a401-e72ca7f24d8${i}`,
      url: `http://www.example.com/?via=ref${i}`,
      leads: 3 + i,
      token: `ref${i + 1}`,
      visitors: 5 + i,
      conversions: 2 + i,
    },
    visits: 30 + i * 5,
    customer: {
      id: `cus_ABC${123 + i}`,
      name: [
        `John Doe`,
        `Jane Smith`,
        `Bob Johnson`,
        `Alice Brown`,
        `Charlie Wilson`,
        `Diana Prince`,
        `Bruce Wayne`,
        `Clark Kent`,
        `Peter Parker`,
        `Tony Stark`,
      ][i],
      email: `user${i}@example.com`,
      platform: "stripe",
    },
    affiliate: {
      id: `dc939584-a94a-4bdf-b8f4-8d255aae72${i}c`,
      email: `affiliate${i}@example.com`,
      leads: 3 + i,
      campaign: {
        id: "ceaef6d9-767e-49aa-a6ab-46c02aa79604",
        name: `Campaign ${i + 1}`,
        created_at: `2020-04-${20 + i}T00:24:08.199Z`,
        updated_at: `2020-04-${20 + i}T00:24:08.199Z`,
      },
      visitors: 5 + i,
      last_name: [
        `Smith`,
        `Johnson`,
        `Williams`,
        `Brown`,
        `Jones`,
        `Garcia`,
        `Miller`,
        `Davis`,
        `Rodriguez`,
        `Martinez`,
      ][i],
      created_at: `2020-04-${20 + i}T00:24:08.334Z`,
      first_name: [
        `James`,
        `Mary`,
        `Robert`,
        `Patricia`,
        `Michael`,
        `Linda`,
        `William`,
        `Elizabeth`,
        `David`,
        `Barbara`,
      ][i],
      updated_at: `2020-05-${i + 1}T19:39:03.028Z`,
      conversions: 2 + i,
      confirmed_at: `2020-04-${20 + i}T00:24:08.331Z`,
      paypal_email: null,
      sign_in_count: i,
      stripe_account_id: null,
      unconfirmed_email: null,
      stripe_customer_id: null,
      paypal_email_confirmed_at: null,
      receive_new_commission_notifications: true,
    },
    created_at: `2025-01-${20 + i}T00:34:28.448Z`,
    became_lead_at: `2025-01-${20 + i}T00:36:28.448Z`,
    became_conversion_at: `2025-01-${20 + i}T00:38:28.448Z`,
    expires_at: `2020-06-${20 + i}T00:34:28.448Z`,
    updated_at: `2020-04-${20 + i}T00:38:28.448Z`,
    deactivated_at: null,
    conversion_state: "conversion",
    stripe_account_id: `acct_ABC${123 + i}`,
    stripe_customer_id: `cus_ABC${123 + i}`,
  }));

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const slicedReferrals = referrals.slice(startIndex, endIndex);

  return NextResponse.json({
    data: slicedReferrals.length > 0 ? slicedReferrals : [],
  });
}
