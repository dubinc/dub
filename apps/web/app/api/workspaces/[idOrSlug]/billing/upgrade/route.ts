import { Session, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/upstash";
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
    const referralCoupon = await getReferralCoupon(session);

    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      billing_address_collection: "required",
      success_url: `${APP_DOMAIN}/${workspace.slug}?${onboarding ? "onboarded" : "upgraded"}=true&plan=${plan}&period=${period}`,
      cancel_url: baseUrl,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
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
      ...(referralCoupon && referralCoupon !== "expired"
        ? {
            discounts: [
              {
                coupon: referralCoupon,
              },
            ],
          }
        : { allow_promotion_codes: true }),
    });

    return NextResponse.json(stripeSession);
  }
});

/**
 * Get a referral coupon for the user if they were referred via a refer.dub.co link.
 * @param session The session object.
 * @returns The coupon ID if the user has a referrer, otherwise null.
 */
const getReferralCoupon = async (session: Session) => {
  let referredBy: string | null = session.user["referredBy"] || null;
  if (!referredBy) {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        referredBy: true,
      },
    });
    referredBy = user?.referredBy || null;
    if (referredBy) {
      const referralCoupon = await redis.get<string>(
        `referralCoupon:${session.user.id}`,
      );
      if (referralCoupon) {
        return referralCoupon;
      } else {
        const coupon = await stripe.coupons.create({
          name: `Referral Discount (${referredBy})`,
          percent_off: 10,
          duration: "repeating",
          duration_in_months: 12,
          max_redemptions: 1,
        });
        const couponId = coupon.id;
        await redis.set(`referralCoupon:${session.user.id}`, couponId);
        return couponId;
      }
    }
  }
  return null;
};
