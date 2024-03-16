import { withAuth } from "@/lib/auth/utils";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const POST = withAuth(async ({ req, project, session }) => {
  let { plan, period, baseUrl, comparePlans } = await req.json();

  if (!plan || !period) {
    return new Response("Invalid plan or period", { status: 400 });
  }

  plan = plan.replace(" ", "+");

  const prices = await stripe.prices.list({
    lookup_keys: [`${plan}_${period}`],
  });

  const subscription = project.stripeId
    ? await stripe.subscriptions.list({
        customer: project.stripeId,
        status: "active",
      })
    : null;

  // if the user already has a subscription, create billing portal to upgrade
  if (project.stripeId && subscription && subscription.data.length > 0) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: project.stripeId,
      return_url: `${baseUrl}?upgrade=${plan}`,
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
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      billing_address_collection: "required",
      success_url: `${APP_DOMAIN}/${project.slug}/settings/billing?success=true`,
      cancel_url: `${baseUrl}?upgrade=${plan}`,
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
  }
});
