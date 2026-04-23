import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/billing/cancel - create a Stripe billing portal session in the cancellation flow
export const POST = withWorkspace(
  async ({ workspace }) => {
    if (!workspace.stripeId)
      return new Response("No Stripe customer ID", { status: 400 });

    try {
      const { data } = await stripe.subscriptions.list({
        customer: workspace.stripeId,
        limit: 10,
      });
      const subscription = data.find(
        (s) => s.status === "active" || s.status === "trialing",
      );
      if (!subscription) {
        return new Response("No active or trialing subscription", {
          status: 400,
        });
      }

      const { url } = await stripe.billingPortal.sessions.create({
        customer: workspace.stripeId,
        return_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
        flow_data: {
          type: "subscription_cancel",
          subscription_cancel: {
            subscription: subscription.id,
          },
        },
      });
      return NextResponse.json(url);
    } catch (error) {
      throw new DubApiError({
        code: "bad_request",
        message: error.raw.message,
      });
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
