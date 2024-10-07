import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const POST = withWorkspace(async ({ req, workspace, session }) => {
  let { plan, period, baseUrl, onboarding } = await req.json();

  if (!plan || !period) {
    return new Response("Invalid plan or period", { status: 400 });
  }

  plan = plan.replace(" ", "+");

  const prices = await stripe.prices.list({
    lookup_keys: [`${plan}_${period}`],
  });

  const activeSubscription = workspace.stripeId
    ? await stripe.subscriptions
        .list({
          customer: workspace.stripeId,
          status: "active",
        })
        .then((res) => res.data[0])
    : null;

  // if the user has an active subscription, create billing portal to upgrade
  if (workspace.stripeId && activeSubscription) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeId,
      return_url: baseUrl,
      flow_data: {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: activeSubscription.id,
          items: [
            {
              id: activeSubscription.items.data[0].id,
              quantity: 1,
              price: prices.data[0].id,
            },
          ],
        },
      },
    });
    return NextResponse.json({ url });
  } else {
    // For both new users and users with canceled subscriptions
    const stripeSession = await stripe.checkout.sessions.create({
      ...(workspace.stripeId
        ? {
            customer: workspace.stripeId,
            // need to pass this or Stripe will throw an error: https://git.new/kX4fi6B
            customer_update: {
              name: "auto",
              address: "auto",
            },
          }
        : {
            customer_email: session.user.email,
          }),
      billing_address_collection: "required",
      success_url: `${APP_DOMAIN}/${workspace.slug}?${onboarding ? "onboarded" : "upgraded"}=true&plan=${plan}&period=${period}`,
      cancel_url: baseUrl,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      mode: "subscription",
      client_reference_id: workspace.id,
      metadata: {
        dubCustomerId: session.user.id,
      },
    });

    return NextResponse.json(stripeSession);
  }
});
