import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/billing/activate-paid-plan — end Stripe billing trial now (charge immediately, subscription becomes active)
export const POST = withWorkspace(
  async ({ workspace }) => {
    if (!workspace.stripeId) {
      return new Response("No Stripe customer ID", { status: 400 });
    }

    const { data: trialingSubs } = await stripe.subscriptions.list({
      customer: workspace.stripeId,
      status: "trialing",
      limit: 1,
    });
    const trialingSubscription = trialingSubs[0];

    if (trialingSubscription) {
      await stripe.subscriptions.update(trialingSubscription.id, {
        trial_end: "now",
        cancel_at_period_end: false,
      });
      return NextResponse.json({ ok: true });
    }

    const { data: activeSubs } = await stripe.subscriptions.list({
      customer: workspace.stripeId,
      status: "active",
      limit: 1,
    });
    if (activeSubs.length > 0) {
      return NextResponse.json({ ok: true });
    }

    throw new DubApiError({
      code: "bad_request",
      message: "No trialing or active subscription found for this workspace.",
    });
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
