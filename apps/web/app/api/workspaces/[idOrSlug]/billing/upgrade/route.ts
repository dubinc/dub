import { DubApiError } from "@/lib/api/errors";
import { getDubAdminRole, withWorkspace } from "@/lib/auth";
import { getDubCustomer } from "@/lib/dub";
import { stripe } from "@/lib/stripe";
import { booleanQuerySchema } from "@/lib/zod/schemas/misc";
import { APP_DOMAIN, DUB_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const upgradePlanSchema = z.object({
  plan: z.enum(["pro", "business", "advanced"]),
  period: z.enum(["monthly", "yearly"]),
  tier: z.number().min(1).max(3).optional().default(1),
  baseUrl: z.string().refine((url) => url.startsWith(APP_DOMAIN), {
    message: "Invalid baseUrl.",
  }),
  onboarding: booleanQuerySchema.nullish(),
  isTrialVariant: booleanQuerySchema.nullish(),
});

// POST /api/workspaces/[idOrSlug]/billing/upgrade
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    let { plan, period, tier, baseUrl, onboarding, isTrialVariant } =
      upgradePlanSchema.parse(await req.json());

    const lookupKey =
      tier > 1 ? `${plan}${tier}_${period}` : `${plan}_${period}`;

    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
    });

    if (prices.data.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: `Price not found for lookup key: ${lookupKey}`,
      });
    }

    const existingSubscription = workspace.stripeId
      ? await Promise.all([
          stripe.subscriptions.list({
            customer: workspace.stripeId,
            status: "active",
            limit: 1,
          }),
          stripe.subscriptions.list({
            customer: workspace.stripeId,
            status: "trialing",
            limit: 1,
          }),
        ]).then(([active, trialing]) => active.data[0] ?? trialing.data[0])
      : null;

    if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview") {
      const adminRole = await getDubAdminRole(session.user.id);
      if (!adminRole) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Not an admin.",
        });
      }
    }

    // if the user has an active or trialing subscription, create billing portal to upgrade
    if (workspace.stripeId && existingSubscription) {
      const { url } = await stripe.billingPortal.sessions.create({
        customer: workspace.stripeId,
        return_url: baseUrl,
        flow_data: {
          type: "subscription_update_confirm",
          subscription_update_confirm: {
            subscription: existingSubscription.id,
            items: [
              {
                id: existingSubscription.items.data[0].id,
                quantity: 1,
                price: prices.data[0].id,
              },
            ],
          },
        },
      });
      return NextResponse.json({ url });
    } else {
      const customer = await getDubCustomer(session.user.id);

      const shouldApplyCheckoutTrial =
        workspace.stripeId == null &&
        workspace.trialEndsAt == null &&
        isTrialVariant;

      // New Stripe customer + no prior trial on workspace: partner checkout trial.
      // Returning Stripe customers (e.g. canceled sub) must not get another trial here.
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
        success_url: onboarding
          ? `${APP_DOMAIN}/onboarding/success?workspace=${workspace.slug}`
          : `${APP_DOMAIN}/${workspace.slug}?upgraded=true&plan=${plan}&period=${period}`,
        cancel_url: baseUrl,
        line_items: [{ price: prices.data[0].id, quantity: 1 }],
        ...(customer?.discount?.couponId
          ? {
              discounts: [
                {
                  coupon:
                    process.env.NODE_ENV !== "production" &&
                    customer.discount.couponTestId
                      ? customer.discount.couponTestId
                      : customer.discount.couponId,
                },
              ],
            }
          : { allow_promotion_codes: true }),
        automatic_tax: {
          enabled: true,
        },
        tax_id_collection: {
          enabled: true,
        },
        mode: "subscription",
        ...(shouldApplyCheckoutTrial
          ? {
              subscription_data: {
                trial_period_days: DUB_TRIAL_PERIOD_DAYS,
              },
            }
          : {}),
        client_reference_id: workspace.id,
        metadata: {
          dubCustomerId: session.user.id,
        },
      });

      return NextResponse.json({ id: stripeSession.id });
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
