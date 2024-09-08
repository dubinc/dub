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

  // if the user already has a subscription, create billing portal to upgrade
  if (workspace.stripeId && subscription && subscription.data.length > 0) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeId,
      return_url: baseUrl,
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

    return NextResponse.json({ url });

    // if the user does not have a subscription, create a new checkout session
  } else {
    const successUrl = onboarding
      ? `${APP_DOMAIN}/${workspace.slug}?onboarded=true&plan=${plan}&period=${period}`
      : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${new URLSearchParams({ upgraded: "true", plan, period })}`;

    // let referralCoupon: string | undefined;
    // if (session.user["referredBy"]) {
    //   const coupon = await stripe.coupons.create({
    //     percent_off: 10,
    //     duration: "repeating",
    //     duration_in_months: 12,
    //     max_redemptions: 1,
    //   });
    //   referralCoupon = coupon.id;
    // }

    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      billing_address_collection: "required",
      success_url: successUrl,
      cancel_url: baseUrl,
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
      // ...(referralCoupon
      //   ? {
      //       discounts: [
      //         {
      //           coupon: referralCoupon,
      //         },
      //       ],
      //     }
      //   : {}),
    });

    return NextResponse.json(stripeSession);
  }
});
