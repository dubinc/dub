import { withAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const POST = withAuth(async ({ searchParams, project, session }) => {
  const { plan } = searchParams;

  if (!plan) {
    return new Response("Missing plan lookup key", { status: 400 });
  }

  const prices = await stripe.prices.list({
    lookup_keys: [plan],
  });

  const stripeSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    billing_address_collection: "required",
    success_url: `${APP_DOMAIN}/${project.slug}/settings/billing?success=true`,
    cancel_url: `${APP_DOMAIN}/${project.slug}/settings/billing?upgrade=${
      plan.split("_")[0]
    }`,
    line_items: [{ price: prices.data[0].id, quantity: 1 }],
    automatic_tax: {
      enabled: true,
    },
    tax_id_collection: {
      enabled: true,
    },
    mode: "subscription",
    allow_promotion_codes: true,
    client_reference_id: project.id,
  });
  return NextResponse.json(stripeSession);
});
