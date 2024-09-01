import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const POST = withWorkspace(async ({ req, workspace, session }) => {
  let { plan, period, baseUrl, comparePlans, onboarding } = await req.json();

  if (!plan || !period) {
    return new Response("Invalid plan or period", { status: 400 });
  }

  plan = plan.replace(" ", "+");

  const prices = await stripe.prices.list({
    lookup_keys: [`${plan}_${period}`],
  });

  const subscription = workspace.stripeId
    ? await stripe.subscriptions.list({
        customer: workspace.stripeId,
        status: "active",
      })
    : null;

  const returnUrl = new URL(baseUrl);
  if (!onboarding) returnUrl.searchParams.append("upgrade", plan);

  // if the user already has a subscription, create billing portal to upgrade
  if (workspace.stripeId && subscription && subscription.data.length > 0) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeId,
      return_url: returnUrl.toString(),
      flow_data: comparePlans
        ? {
            type: "subscription_update",
            subscription_update: {
              subscription: subscription.data[0].id,
            },
          }
        : {
            type: "subscription_update_confirm",
            subscription_update_confirm: {
              subscription: subscription.data[0].id,
              items: [
                {
                  id: subscription.data[0].items.data[0].id,
                  quantity: 1,
                  price: prices.data[0].id,
                },
              ],
            },
          },
    });

    return NextResponse.json(url);

    // if the user does not have a subscription, create a new checkout session
  } else {
    const successUrl = onboarding
      ? `${APP_DOMAIN}/${workspace.slug}?onboarded=true&plan=${plan}`
      : `${APP_DOMAIN}/${workspace.slug}/settings/billing?success=true&plan=${plan}&period=${period}`;

    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      billing_address_collection: "required",
      success_url: successUrl,
      cancel_url: returnUrl.toString(),
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      mode: "subscription",
      allow_promotion_codes: true,
      client_reference_id: workspace.id,
      metadata: {
        dubCustomerId: session.user.id,
      },
    });

    return NextResponse.json(stripeSession);
  }
});
