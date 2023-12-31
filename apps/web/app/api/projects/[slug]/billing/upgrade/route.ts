import { withAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const POST = withAuth(async ({ searchParams, project, session }) => {
  const { price } = searchParams;

  if (!price) {
    return new Response("Missing price", { status: 400 });
  }

  const prices = await stripe.prices.list({
    lookup_keys: [price],
  });

  const stripeSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    billing_address_collection: "required",
    success_url: `${APP_DOMAIN}/${project.slug}/settings/billing?success=true`,
    cancel_url: `${APP_DOMAIN}/${project.slug}/settings/billing`,
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
